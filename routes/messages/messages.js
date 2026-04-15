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

    /* -----------------------------
       1. CREATE THREAD (if needed)
    ----------------------------- */
    if (!finalThreadId) {
      const threadType = recipient_profile_id
        ? "direct"
        : target_role
        ? "role"
        : "group";

      const threadRes = await client.query(
        `INSERT INTO threads (church_id, type)
         VALUES ($1, $2)
         RETURNING id`,
        [church_id, threadType]
      );

      finalThreadId = threadRes.rows[0].id;

      const participants = new Set([profile_id]);

      // Direct message
      if (recipient_profile_id) {
        participants.add(recipient_profile_id);
      }

      // Role-based message
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

      // Insert participants
      for (const userId of participants) {
        await client.query(
          `INSERT INTO thread_participants (thread_id, user_id)
           VALUES ($1, $2)`,
          [finalThreadId, userId]
        );
      }
    }

    /* -----------------------------
       2. INSERT MESSAGE
    ----------------------------- */
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

    /* -----------------------------
       3. UPDATE THREAD META
    ----------------------------- */
    await client.query(
      `UPDATE threads
       SET last_message_id = $1,
           last_message_at = $2
       WHERE id = $3`,
      [message_id, created_at, finalThreadId]
    );

    /* -----------------------------
       4. NOTIFICATIONS
    ----------------------------- */
    const participantsRes = await client.query(
      `SELECT user_id
       FROM thread_participants
       WHERE thread_id = $1
       AND user_id != $2`,
      [finalThreadId, profile_id]
    );

    for (const row of participantsRes.rows) {
      await client.query(
        `INSERT INTO notifications (
          user_id, church_id, type, title, message, related_id, related_type
        )
        SELECT auth_user_id, $1, 'message', 'New Message', $2, $3, 'message'
        FROM profiles
        WHERE id = $4`,
        [church_id, content, message_id, row.user_id]
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
   GET /api/messages/inbox
========================================================= */
router.get("/inbox", async (req, res) => {
  const { id: profile_id, church_id } = req.user;

  try {
    const result = await pool.query(
      `SELECT
        t.id AS thread_id,
        m.content AS last_message,
        m.created_at AS last_message_at,
        p.full_name AS other_user_name,

        COUNT(m2.id) FILTER (
          WHERE m2.created_at > COALESCE(tr.last_read_at, '1970-01-01')
          AND m2.sender_id != $1
        ) AS unread_count

      FROM thread_participants tp
      JOIN threads t ON tp.thread_id = t.id
      LEFT JOIN messages m ON t.last_message_id = m.id

      LEFT JOIN thread_participants tp2
        ON tp2.thread_id = t.id AND tp2.user_id != $1

      LEFT JOIN profiles p ON p.id = tp2.user_id

      LEFT JOIN thread_reads tr
        ON tr.thread_id = t.id AND tr.user_id = $1

      LEFT JOIN messages m2 ON m2.thread_id = t.id

      WHERE tp.user_id = $1
        AND t.church_id = $2

      GROUP BY t.id, m.id, p.full_name, tr.last_read_at
      ORDER BY t.last_message_at DESC`,
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
