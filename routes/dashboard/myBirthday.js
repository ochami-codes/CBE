import express from "express";

const router = express.Router();

/* --------------------------------------------------
   GET /dashboard/my-birthday
-------------------------------------------------- */
router.get("/", async (req, res) => {
  const supabase = req.supabase;
  const authUserId = req.user?.id;

  if (!authUserId) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  try {
    // 1️⃣ Fetch profile by id OR auth_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .or(`id.eq.'${authUserId}',auth_user_id.eq.'${authUserId}'`)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;

    const isBirthday =
      dob &&
      dob.getUTCMonth() === new Date().getUTCMonth() &&
      dob.getUTCDate() === new Date().getUTCDate();

    return res.json({
      birthday: {
        birthday: profile.date_of_birth || null,
        full_name: profile.full_name,
      },
      isBirthday: !!isBirthday,
    });

  } catch (err) {
    console.error("GET /dashboard/my-birthday error:", err);
    return res.status(500).json({ message: "Failed to load birthday information" });
  }
});

export default router;
