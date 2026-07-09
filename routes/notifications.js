import express from "express";
const router = express.Router();

/* --------------------------------------------------
   GET /notifications
   Get paginated notifications for logged-in user
-------------------------------------------------- */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;
  const churchId = req.user.active_church_id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", profileId)
    .eq("church_id", churchId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }

  res.json({
    notifications: data,
    total: count,
    page,
    limit,
  });
});

/* --------------------------------------------------
   GET /notifications/unread-count
   Get number of unread notifications
-------------------------------------------------- */
router.get("/unread-count", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;
  const churchId = req.user.active_church_id;
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profileId)
    .eq("church_id", churchId)
    .eq("is_read", false);

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to get unread count" });
  }

  res.json({ unread: count || 0 });
});

/* --------------------------------------------------
   PATCH /notifications/:id/read
   Mark single notification as read
-------------------------------------------------- */
router.patch("/:id/read", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;
  const churchId = req.user.active_church_id;
  const { id } = req.params;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", profileId)
    .eq("church_id", churchId);

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to mark as read" });
  }

  res.json({ success: true });
});

/* --------------------------------------------------
   PATCH /notifications/read-all
   Mark all user notifications as read
-------------------------------------------------- */
router.patch("/read-all", async (req, res) => {
  const supabase = req.supabase;
  const profileId = req.user.id;
  const churchId = req.user.active_church_id;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", profileId)
    .eq("church_id", churchId)
    .eq("is_read", false);

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to mark all as read" });
  }

  res.json({ success: true });
});

export default router;
