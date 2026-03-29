import express from "express";

const router = express.Router();

/**
 * GET /dashboard/my-birthday
 * Returns logged-in user's birthday info
 */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const authUserId = req.user?.id;

  if (!authUserId) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  try {
    // 1️⃣ Fetch profile by auth_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("auth_user_id", authUserId)
      .maybeSingle(); // ✅ safely returns null if not found

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({ message: "Failed to load profile" });
    }

    if (!profile) {
      console.warn("No profile found for auth user:", authUserId);
      return res.status(404).json({ message: "Profile not found" });
    }

    const profileId = profile.id;

    // 2️⃣ Handle missing or invalid birthday
    const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
    if (!dob || isNaN(dob)) {
      return res.json({
        birthday: { birthday: null, full_name: profile.full_name },
        isBirthday: false,
      });
    }

    // 3️⃣ Compare with today
    const today = new Date();
    const isBirthday =
      dob.getUTCMonth() === today.getUTCMonth() &&
      dob.getUTCDate() === today.getUTCDate();

    return res.json({
      birthday: {
        birthday: profile.date_of_birth,
        full_name: profile.full_name,
      },
      isBirthday,
    });

  } catch (err) {
    console.error("GET /dashboard/my-birthday error:", err);
    return res.status(500).json({ message: "Failed to load birthday information" });
  }
});

export default router;
