import express from "express";

const router = express.Router();

// ------------------------------
// POST /api/messages
// Send a message (role-based or direct) with notifications
// ------------------------------
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { id: profile_id, church_id } = req.user;

  const { content, target_role_id, recipient_profile_id, parent_message_id } = req.body;

  // ---------- Validation ----------
  if (!content?.trim()) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

if (!parent_message_id && !target_role_id && !recipient_profile_id) {
  return res.status(400).json({
    error: "Provide a thread, target role ID, or recipient profile ID",
  });
}
  try {
    const { data, error } = await supabase.rpc("send_message_with_notifications", {
      p_sender_profile_id: profile_id,
      p_church_id: church_id,
      p_content: content,
      p_target_role_id: target_role_id || null,
      p_recipient_profile_id: recipient_profile_id || null,
      p_parent_message_id: parent_message_id || null,
    });

    if (error) throw error;

    res.json({
      success: true,
      message_id: data?.[0]?.message_id ?? null,
    });
  } catch (err) {
    console.error("❌ POST /api/messages error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ------------------------------
// GET /api/messages/inbox
// Fetch all messages for the current user
// ------------------------------
router.get("/inbox", async (req, res) => {
  const supabase = req.supabase;
  const { id: profile_id, church_id } = req.user;

  try {
    const { data, error } = await supabase.rpc("get_inbox", {
      p_profile_id: profile_id,
      p_church_id: church_id,
    });

    if (error) throw error;

    res.json({ inbox: data || [] });
  } catch (err) {
    console.error("❌ GET /api/messages/inbox error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/conversation/:thread_id
// Fetch all messages in a conversation (flat thread)
router.get("/conversation/:thread_id", async (req, res) => {
  const supabase = req.supabase;
  const { thread_id } = req.params;

  if (!thread_id) return res.status(400).json({ error: "Thread ID is required" });

  try {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        parent_message_id,
        sender:profiles!messages_sender_fk(full_name)
      `)
      .or(`id.eq.${thread_id},parent_message_id.eq.${thread_id}`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ messages: data || [] });
  } catch (err) {
    console.error("❌ GET conversation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// POST /api/messages/read
// Mark a conversation/thread as read
// ------------------------------
router.post("/read", async (req, res) => {
  const supabase = req.supabase;
  const { id: profile_id } = req.user;
  const { thread_id } = req.body;

  if (!thread_id) {
    return res.status(400).json({ error: "Thread ID is required" });
  }

  try {
    const { error } = await supabase.rpc("mark_thread_read", {
      p_profile_id: profile_id,
      p_thread_id: thread_id,
    });

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error(`❌ POST /api/messages/read error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// GET /messages/leaders
// Fetch leaders grouped by role
// ------------------------------
router.get("/leaders", async (req, res) => {
  const supabase = req.supabase;
  const { church_id } = req.user;

  try {
    const { data, error } = await supabase
      .from("members")
      .select(`
        profile_id,
        profiles ( full_name ),
        role:roles!inner (
          id,
          name,
          is_leader
        )
      `)
      .eq("church_id", church_id)
      .eq("role.is_leader", true);

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
// ------------------------------
   // GET /messages/unread-count
// ------------------------------
router.get("/unread-count", async (req, res) => {
  const supabase = req.supabase;
  const { id: profile_id, church_id } = req.user;

  try {
   const { count, error } = await supabase
  .from("message_recipients")
  .select("*", { count: "exact", head: true })
  .eq("recipient_user_id", profile_id)
  .eq("is_read", false)
  .eq("church_id", church_id);
    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (err) {
    console.error("❌ GET /messages/unread-count error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
