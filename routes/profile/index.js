import express from "express";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const authUserId = req.user?.id;

    if (!authUserId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    // ---------------- Fetch profile by auth_user_id ----------------
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
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({ message: "Failed to load profile" });
    }

    if (!profile) {
      console.warn("No profile found for auth user:", authUserId);
      return res.status(404).json({ message: "Profile not found" });
    }

    const profileId = profile.id;

    // ---------------- Fetch membership info ----------------
    const { data: member } = await supabase
      .from("members")
      .select("role_name, active")
      .eq("profile_id", profileId)
      .maybeSingle();

    // ---------------- Fetch giving summary ----------------
    const { data: contributions } = await supabase
      .from("member_giving_summary")
      .select(`
        fund_name,
        year,
        total_amount,
        yearly_total,
        overall_total
      `)
      .eq("profile_id", profileId);

    const isMember = !!profile.is_member;

    // ---------------- Respond ----------------
    return res.json({
      profile: {
        id: profile.id,
        auth_user_id: authUserId, // include for clarity
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        email: profile.email || null,
        role_name: isMember ? member?.role_name || "Member" : "Guest",
        active: member?.active ?? true,
        church_id: profile.church_id || null,
        is_member: isMember,
      },
      contributions: contributions || [],
    });
  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

export default router;
