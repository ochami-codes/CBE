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
// ------------------------------
router.get("/inbox", async (req, res) => {
  const supabase = req.supabase;
  const { id: profile_id, church_id } = req.user;

  try {
    const { data, error } = await supabase
      .from("message_recipients")
      .select(`
        id,
        is_read,
        recipient:profiles!message_recipients_recipient_user_id_fkey (
          id,
          full_name
        ),
        message:messages (
          id,
          parent_message_id,
          content,
          created_at,
          sender_id,
          church_id,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name
          )
        )
      `)
      .eq("recipient_user_id", profile_id)
      .eq("message.church_id", church_id)
      .eq("is_deleted", false)
      .order("created_at", { foreignTable: "messages", ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({ inbox: [] });
    }

    const threadsMap = new Map();

    for (const row of data) {
      const msg = row.message;
      if (!msg) continue;

      const threadId = msg.parent_message_id || msg.id;

      // Determine OTHER USER correctly
      let otherUserName = "Unknown";

      if (msg.sender_id === profile_id) {
        // I sent it → other user is recipient
        otherUserName = row.recipient?.full_name || "Unknown";
      } else {
        // I received it → other user is sender
        otherUserName = msg.sender?.full_name || "Unknown";
      }

      if (!threadsMap.has(threadId)) {
        threadsMap.set(threadId, {
          thread_id: threadId,
          last_message: msg.content,
          last_message_at: msg.created_at,
          other_user_name: otherUserName,
          unread_count: 0,
        });
      }

      // Count unread messages in thread
      if (!row.is_read) {
        threadsMap.get(threadId).unread_count++;
      }
    }

    // Convert to array + sort latest first
    const inbox = Array.from(threadsMap.values()).sort(
      (a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)
    );

    res.json({ inbox });

  } catch (err) {
    console.error("❌ GET /api/messages/inbox error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/conversation/:thread_id
router.get("/conversation/:thread_id", async (req, res) => {
  const supabase = req.supabase;
  const { thread_id } = req.params;
  const { id: profile_id, church_id } = req.user;

  if (!thread_id) {
    return res.status(400).json({ error: "Thread ID is required" });
  }

  try {
    // 1. Fetch messages ONLY if user is part of them
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        parent_message_id,
        sender:profiles!messages_sender_id_fkey (
          id,
          full_name
        ),
        recipients:message_recipients!inner (
          recipient_user_id,
          is_read
        )
      `)
      .or(`id.eq.${thread_id},parent_message_id.eq.${thread_id}`)
      .eq("church_id", church_id)
      .eq("recipients.recipient_user_id", profile_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // 2. Mark unread messages as read
    const unreadMessageIds =
      data
        ?.filter(
          (m) =>
            m.sender_id !== profile_id &&
            m.recipients?.some((r) => !r.is_read)
        )
        .map((m) => m.id) || [];

    if (unreadMessageIds.length > 0) {
      await supabase
        .from("message_recipients")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in("message_id", unreadMessageIds)
        .eq("recipient_user_id", profile_id);
    }

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
  const { church_id, id:currentUserId } = req.user;

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
