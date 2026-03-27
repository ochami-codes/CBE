// backend/routes/profile/index.js
import express from "express";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;

    /* ---------------------------------
       1️⃣ Fetch profile (SOURCE OF TRUTH)
    ---------------------------------- */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        email,
        church_id,
        is_member
      `)
      .eq("auth_user_id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    /* ---------------------------------
       2️⃣ Fetch membership info separately (safer)
    ---------------------------------- */
    const { data: member } = await supabase
      .from("members")
      .select("role_name, active")
      .eq("profile_id", userId)
      .maybeSingle();

    /* ---------------------------------
       3️⃣ Giving summary (VIEW - reporting only)
    ---------------------------------- */
    const { data: contributions } = await supabase
      .from("member_giving_summary")
      .select(`
        fund_name,
        year,
        total_amount,
        yearly_total,
        overall_total
      `)
      .eq("profile_id", userId);

    const isMember = profile.is_member === true;

    /* ---------------------------------
       4️⃣ Respond
    ---------------------------------- */
    return res.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        email: profile.email || null,
        role_name: isMember
          ? member?.role_name || "Member"
          : "Guest",
        active: member?.active ?? true,
        church_id: profile.church_id || null,
        is_member: isMember,
      },
      contributions: contributions || [],
    });

  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({
      message: "Failed to load profile",
    });
  }
});

export default router;
