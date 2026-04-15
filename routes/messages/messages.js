import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =========================================================
   POST /api/messages
   Send message (direct / role / group)
========================================================= */
router.post("/", async (req, res) => {
  const client = await pool.connect();

  const { id: profile_id, church_id } = req.user;
  const { content, recipient_profile_id, target_role, thread_id } = req.body;

  try {
    await client.query("BEGIN");

    if (!content?.trim()) {
      throw new Error("Message cannot be empty");
    }

    let finalThreadId = thread_id;

    /* =====================================================
       1. FIND OR CREATE THREAD
    ===================================================== */
    if (!finalThreadId) {
      // ---------- DIRECT ----------
      if (recipient_profile_id) {
        const existing = await client.query(
          `SELECT t.id
           FROM threads t
           JOIN thread_participants tp1 ON tp1.thread_id = t.id
           JOIN thread_participants tp2 ON tp2.thread_id = t.id
           WHERE t.type = 'direct'
             AND t.church_id = $1
             AND tp1.user_id = $2
             AND tp2.user_id = $3
           LIMIT 1`,
          [church_id, profile_id, recipient_profile_id]
        );

        if (existing.rows.length > 0) {
          finalThreadId = existing.rows[0].id;
        }
      }

      // ---------- ROLE ----------
      else if (target_role) {
        const existing = await client.query(
          `SELECT id
           FROM threads
           WHERE type = 'role'
             AND church_id = $1
             AND role_name = $2
           LIMIT 1`,
          [church_id, target_role]
        );

        if (existing.rows.length > 0) {
          finalThreadId = existing.rows[0].id;
        }
      }

      // ---------- CREATE ----------
      if (!finalThreadId) {
        const threadType = recipient_profile_id
          ? "direct"
          : target_role
          ? "role"
          : "group";

        const threadRes = await client.query(
          `INSERT INTO threads (church_id, type, role_name)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [church_id, threadType, target_role || null]
        );

        finalThreadId = threadRes.rows[0].id;

        const participants = new Set([profile_id]);

        // direct
        if (recipient_profile_id) {
          participants.add(recipient_profile_id);
        }

        // role
        if (target_role) {
          const roleRes = await client.query(
            `SELECT p.id
             FROM profiles p
             JOIN roles r ON p.role_id = r.id
             WHERE r.name = $1 AND p.church_id = $2`,
            [target_role, church_id]
          );

          roleRes.rows.forEach((r) => participants.add(r.id));
        }

        // insert participants (safe, no duplicates)
        for (const userId of participants) {
          await client.query(
            `INSERT INTO thread_participants (thread_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (thread_id, user_id) DO NOTHING`,
            [finalThreadId, userId]
          );
        }
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
       4. NOTIFICATIONS (clean + no duplicates)
    ===================================================== */

    // get sender name once
    const senderRes = await client.query(
      `SELECT full_name FROM profiles WHERE id = $1`,
      [profile_id]
    );

    const senderName = senderRes.rows[0]?.full_name || "Someone";

    // get unique participants
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
/* =========================================================
   GET /api/messages/conversation/:thread_id
========================================================= */
router.get("/conversation/:thread_id", async (req, res) => {
  const { thread_id } = req.params;
  const { church_id } = req.user;

  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.content,
        m.created_at,
        m.sender_id,
        p.full_name
      FROM messages m
      JOIN profiles p ON p.id = m.sender_id
      JOIN threads t ON t.id = m.thread_id
      WHERE m.thread_id = $1
        AND t.church_id = $2
      ORDER BY m.created_at ASC`,
      [thread_id, church_id]
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
  const { id: profile_id } = req.user;

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
   GET /messages/leaders
========================================================= */
router.get("/leaders", async (req, res) => {
  const supabase = req.supabase;
  const { church_id, id: currentUserId } = req.user;

  try {
    const { data, error } = await supabase
      .from("members")
      .select(`
        profile_id,
        profiles(full_name),
        role:roles!inner (
          id,
          name,
          is_leader
        )
      `)
      .eq("church_id", church_id)
      .eq("role.is_leader", true)
      .neq("profile_id", currentUserId);

    if (error) throw error;

    const grouped = {};

    data.forEach((m) => {
      const roleName = m.role?.name;
      const name = m.profiles?.full_name;

      if (!roleName || !name) return;

      if (!grouped[roleName]) {
        grouped[roleName] = { role: roleName, users: [] };
      }

      grouped[roleName].users.push({
        id: m.profile_id,
        name,
      });
    });

    res.json({ roles: Object.values(grouped) });
  } catch (err) {
    console.error("❌ GET /messages/leaders error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   GET /messages/unread-count (placeholder)
========================================================= */
router.get("/unread-count", async (req, res) => {
  res.json({ count: 0 });
});

export default router;
