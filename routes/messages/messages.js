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
import express from "express";
const router = express.Router();

router.get("/conversation/:thread_id", async (req, res) => {
  const supabase = req.supabase;
  const { id: profile_id, church_id } = req.user;
  const { thread_id } = req.params;

  if (!thread_id) {
    return res.status(400).json({ error: "Thread ID is required" });
  }

  try {
    // Debug logging
    console.log(`[DEBUG] Fetching messages for thread_id=${thread_id}, profile_id=${profile_id}`);

    // Fetch messages in this flat thread (root + direct replies)
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        parent_message_id,
        profiles!inner(full_name)
      `)
      .or(`id.eq.${thread_id},parent_message_id.eq.${thread_id}`)
      .eq("church_id", church_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[ERROR] Supabase fetch failed:`, error);
      return res.status(500).json({ error: error.message || "Failed to fetch messages" });
    }

    // Transform for frontend
    const messages = data.map((m) => ({
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      sender_id: m.sender_id,
      sender_name: m.profiles.full_name,
      is_me: m.sender_id === profile_id,
      parent_message_id: m.parent_message_id,
    }));

    res.json({ messages });
  } catch (err) {
    console.error(`[ERROR] GET /conversation/${thread_id} failed:`, err);
    res.status(500).json({ error: err.message || "Unexpected error" });
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
    // Get ONLY leaders directly from DB
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role:roles (
          id,
          name,
          is_leader
        )
      `)
      .eq("church_id", church_id)
      .eq("roles.is_leader", true); // 👈 KEY CHANGE

    if (error) throw error;

    // Group by role
    const grouped = {};

    data.forEach((user) => {
      const roleName = user.role?.name;

      if (!roleName) return;

      if (!grouped[roleName]) {
        grouped[roleName] = {
          role: roleName,
          users: [],
        };
      }

      grouped[roleName].users.push({
        id: user.id,
        name: user.full_name,
      });
    });

    res.json({
      roles: Object.values(grouped),
    });
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
