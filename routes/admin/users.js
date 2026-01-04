// routes/admin/users.js
import express from "express";

const router = express.Router();

router.post("/:id/deactivate", async (req, res) => {
  const targetUserId = req.params.id;

  // Optional: prevent self-deactivation
  if (req.user.id === targetUserId) {
    return res.status(400).json({ message: "You cannot deactivate yourself." });
  }

  try {
    const { error } = await req.supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", targetUserId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
