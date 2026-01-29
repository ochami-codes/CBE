// backend/routes/dashboard/myBirthday.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /dashboard/my-birthday
 * Returns logged-in user's name, date of birth, and isBirthday flag
 */
router.get("/", authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, date_of_birth")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Calculate if today is the user's birthday
    const today = new Date();
    const dob = new Date(data.date_of_birth);
    const isBirthday =
      dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();

    res.json({
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      isBirthday,
    });
  } catch (err) {
    console.error("My birthday route error:", err);
    res.status(500).json({ message: "Failed to load birthday information" });
  }
});

export default router;
