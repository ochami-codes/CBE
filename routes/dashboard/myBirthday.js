// backend/routes/dashboard/myBirthday.js
import express from "express";
import { supabase } from "../../supabaseClient.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET /dashboard/my-birthday
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, date_of_birth")
      .eq("id", userId)
      .single();

    if (error || !data) return res.status(404).json({ error: "Profile not found" });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
