import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthenticated" });

    // Fetch profile by auth_user_id OR id
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .limit(1);

    if (profileError || !profiles?.length) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const profile = profiles[0];

    // Handle missing or invalid birthday
    const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
    const today = new Date();
    const isBirthday = dob ? dob.getUTCDate() === today.getUTCDate() && dob.getUTCMonth() === today.getUTCMonth() : false;

    return res.json({
      birthday: {
        birthday: dob ? profile.date_of_birth : null,
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
