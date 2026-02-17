// backend/routes/dashboard/myBirthday.js
import express from "express";

const router = express.Router();

/**
 * GET /dashboard/my-birthday
 * Returns logged-in user's birthday info
 */
router.get("/", async (req, res) => {
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

    // If no birthday is set
    if (!data.date_of_birth) {
      return res.json({
        birthday: {
          birthday: null,
          full_name: data.full_name,
        },
        isBirthday: false,
      });
    }

    // Parse the date safely
    const dob = new Date(data.date_of_birth);
    if (isNaN(dob)) {
      return res.json({
        birthday: {
          birthday: null,
          full_name: data.full_name,
        },
        isBirthday: false,
      });
    }

    const today = new Date();
    const isBirthday =
      dob.getUTCMonth() === today.getUTCMonth() &&
      dob.getUTCDate() === today.getUTCDate();

    res.json({
      birthday: {
        birthday: data.date_of_birth, // matches frontend expectation
        full_name: data.full_name,
      },
      isBirthday,
    });
  } catch (err) {
    console.error("My birthday route error:", err);
    res.status(500).json({ message: "Failed to load birthday information" });
  }
});

export default router;
