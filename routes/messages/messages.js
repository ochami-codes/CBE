import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =========================================================
   POST /api/messages
   Send message (direct / role / group)
========================================================= */
router.post("/", async (req, res) => {
  const client = await pool.connect();
  const profile_id = req.user.id;
const church_id = req.user.active_church_id;
  const { content, recipient_profile_id, thread_id } = req.body;
if (!church_id) {
  return res.status(400).json({
    message: "No active church selected",
  });
}
  try {
    await client.query("BEGIN");

    if (!content?.trim()) {
      throw new Error("Message cannot be empty");
    }

    if (!recipient_profile_id && !thread_id) {
      throw new Error("Recipient is required for direct message");
    }

    let finalThreadId = thread_id;

    /* =====================================================
       1. FIND OR CREATE DIRECT THREAD ONLY
    ===================================================== */
    if (!finalThreadId) {
      const existing = await client.query(
        `
        SELECT t.id
        FROM threads t
        JOIN thread_participants tp ON tp.thread_id = t.id
        WHERE t.type = 'direct'
          AND t.church_id = $1
          AND tp.user_id IN ($2, $3)
        GROUP BY t.id
        HAVING COUNT(DISTINCT tp.user_id) = 2
        LIMIT 1
        `,
        [church_id, profile_id, recipient_profile_id]
      );

      if (existing.rows.length > 0) {
        finalThreadId = existing.rows[0].id;
      } else {
        const threadRes = await client.query(
          `INSERT INTO threads (church_id, type)
           VALUES ($1, 'direct')
           RETURNING id`,
          [church_id]
        );

        finalThreadId = threadRes.rows[0].id;

        // add both participants (safe insert)
        await client.query(
          `INSERT INTO thread_participants (thread_id, user_id)
           VALUES ($1, $2), ($1, $3)
           ON CONFLICT (thread_id, user_id) DO NOTHING`,
          [finalThreadId, profile_id, recipient_profile_id]
        );
      }
    }

    /* =====================================================
       2. INSERT MESSAGE
    ===================================================== */
    const msgRes = await client.query(
      `INSERT INTO messages (thread_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [finalThreadId, profile_id, content]
    );

    const { id: message_id, created_at } = msgRes.rows[0];

    /* mark sender as read */
    await client.query(
      `INSERT INTO thread_reads (thread_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (thread_id, user_id)
       DO UPDATE SET last_read_at = NOW()`,
      [finalThreadId, profile_id]
    );

    /* =====================================================
       3. UPDATE THREAD META
    ===================================================== */
    await client.query(
      `UPDATE threads
       SET last_message_id = $1,
           last_message_at = $2
       WHERE id = $3`,
      [message_id, created_at, finalThreadId]
    );

    /* =====================================================
       4. NOTIFICATIONS (NO DUPLICATES)
    ===================================================== */

    const senderRes = await client.query(
      `SELECT full_name FROM profiles WHERE id = $1`,
      [profile_id]
    );

    const senderName = senderRes.rows[0]?.full_name || "Someone";

    const participantsRes = await client.query(
      `SELECT DISTINCT user_id
       FROM thread_participants
       WHERE thread_id = $1
         AND user_id != $2`,
      [finalThreadId, profile_id]
    );

    for (const row of participantsRes.rows) {
      const preview =
        content.length > 40 ? content.slice(0, 40) + "..." : content;

      await client.query(
        `INSERT INTO notifications (
          user_id, church_id, type, title, message, related_id, related_type
        )
        SELECT auth_user_id, $1, 'message', $2, $3, $4, 'message'
        FROM profiles
        WHERE id = $5`,
        [
          church_id,
          "New Message",
          `${senderName}: ${preview}`,
          message_id,
          row.user_id,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message_id,
      thread_id: finalThreadId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /inbox
router.get("/inbox", async (req, res) => {
  const profile_id = req.user.id;
const church_id = req.user.active_church_id;
if (!church_id) {
  return res.status(400).json({
    message: "No active church selected",
  });
}
  try {
    const result = await pool.query(
      `
      SELECT
        t.id AS thread_id,
        t.type,
        t.role_name,

        m.content AS last_message,
        m.created_at AS last_message_at,

        -- ✅ include both id + name
        p.id AS other_user_id,
        p.full_name AS other_user_name,

        COUNT(m2.id) FILTER (
          WHERE m2.created_at > COALESCE(tr.last_read_at, '1970-01-01')
          AND m2.sender_id != $1
        ) AS unread_count

      FROM thread_participants tp
      JOIN threads t
        ON t.id = tp.thread_id

      LEFT JOIN messages m
        ON m.id = t.last_message_id

      -- get the "other user"
      LEFT JOIN thread_participants tp2
        ON tp2.thread_id = t.id
        AND tp2.user_id != $1

      LEFT JOIN profiles p
        ON p.id = tp2.user_id

      LEFT JOIN thread_reads tr
        ON tr.thread_id = t.id
        AND tr.user_id = $1

      LEFT JOIN messages m2
        ON m2.thread_id = t.id

      WHERE tp.user_id = $1
        AND t.church_id = $2

      GROUP BY
        t.id,
        t.type,
        t.role_name,
        m.id,
        p.id,                -- ✅ REQUIRED
        p.full_name,
        tr.last_read_at

      ORDER BY t.last_message_at DESC NULLS LAST
      `,
      [profile_id, church_id]
    );

    res.json({ inbox: result.rows });
  } catch (err) {
    console.error("❌ INBOX ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
/* =========================================================
   GET /api/messages/conversation/:thread_id
========================================================= */
router.get("/conversation/:thread_id", async (req, res) => {
     const { thread_id } = req.params;
const { id: currentUserId } = req.user;

  try {
const result = await pool.query(
  `SELECT
    m.id,
    m.content,
    m.created_at,
    m.sender_id,

    CASE
      WHEN tr.last_read_at >= m.created_at THEN true
      ELSE false
    END AS is_read,

    p.full_name

  FROM messages m
  JOIN profiles p ON p.id = m.sender_id

  LEFT JOIN thread_reads tr
    ON tr.thread_id = m.thread_id
   AND tr.user_id = $2

  WHERE m.thread_id = $1
  AND EXISTS (
    SELECT 1
    FROM thread_participants tp
    WHERE tp.thread_id = m.thread_id
    AND tp.user_id = $2
  )

  ORDER BY m.created_at ASC`,
  [thread_id, currentUserId]
);
    res.json({ messages: result.rows });
  } catch (err) {
    console.error("❌ CONVERSATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   POST /api/messages/read
========================================================= */
router.post("/read", async (req, res) => {
  const { thread_id } = req.body;
  const profile_id = req.user.id;

  try {
    await pool.query(
      `INSERT INTO thread_reads (thread_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (thread_id, user_id)
       DO UPDATE SET last_read_at = NOW()`,
      [thread_id, profile_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ READ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   GET /messages/users (leaders + members)
========================================================= */
router.get("/users", async (req, res) => {
  const supabase = req.supabase;
  const { active_church_id, id: currentUserId } = req.user;

  try {
    const { data, error } = await supabase
      .from("members")
      .select(`
        profile_id,
        profiles(full_name),
        member_roles (
          roles (
            id,
            name,
            is_leader
          )
        )
      `)
      .eq("church_id", active_church_id)
      .neq("profile_id", currentUserId);

    if (error) throw error;

    const grouped = {};

    data.forEach((m) => {
      const name = m.profiles?.full_name;
      if (!name) return;

      const roles = m.member_roles?.map((mr) => mr.roles) || [];

      // fallback if no roles assigned
      if (roles.length === 0) {
        roles.push({ name: "member", is_leader: false });
      }

      roles.forEach((role) => {
        const roleName = role?.name || "member";
        const isLeader = role?.is_leader || false;

        const key = isLeader
          ? `leader:${roleName}`
          : "member";

        if (!grouped[key]) {
          grouped[key] = {
            type: isLeader ? "leaders" : "members",
            role: isLeader ? roleName : "member",
            users: [],
          };
        }

        grouped[key].users.push({
          id: m.profile_id,
          name,
        });
      });
    });

    // Optional: remove duplicate users in same group
    Object.values(grouped).forEach((group) => {
      const seen = new Set();
      group.users = group.users.filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
    });

    // Sort groups (leaders first, then alphabetically)
    const sortedGroups = Object.values(grouped).sort((a, b) => {
      if (a.type === "leaders" && b.type !== "leaders") return -1;
      if (a.type !== "leaders" && b.type === "leaders") return 1;
      return a.role.localeCompare(b.role);
    });

    res.json({ groups: sortedGroups });

  } catch (err) {
    console.error("❌ GET /users error:", err);
    res.status(500).json({ error: err.message });
  }
});
/* =========================================================
   GET /messages/unread-count
========================================================= */
router.get("/unread-count", async (req, res) => {
  const profile_id = req.user.id;
const church_id = req.user.active_church_id;

  try {
    const result = await pool.query(
      `
      SELECT COUNT(m.id)::int AS count
      FROM messages m
      JOIN threads t ON t.id = m.thread_id

      -- user must be part of thread
      JOIN thread_participants tp
        ON tp.thread_id = t.id
        AND tp.user_id = $1

      -- read state
      LEFT JOIN thread_reads tr
        ON tr.thread_id = t.id
        AND tr.user_id = $1

      WHERE t.church_id = $2
        AND m.sender_id != $1
        AND m.created_at > COALESCE(tr.last_read_at, '1970-01-01')
      `,
      [profile_id, church_id]
    );

    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error("❌ UNREAD COUNT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET if users have a thread
router.get("/thread-with/:user_id", async (req, res) => {
  const currentUserId = req.user.id;
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT t.id AS thread_id
      FROM threads t
      JOIN thread_participants tp1
        ON tp1.thread_id = t.id
      JOIN thread_participants tp2
        ON tp2.thread_id = t.id
      WHERE tp1.user_id = $1
        AND tp2.user_id = $2
      LIMIT 1
      `,
      [currentUserId, user_id]
    );

    res.json({
      thread_id: result.rows[0]?.thread_id || null,
    });
  } catch (err) {
    console.error("❌ THREAD LOOKUP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
