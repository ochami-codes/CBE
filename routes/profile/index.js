import express from "express";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", async (req, res) => {
  console.log("=== /profile route hit ===");
  const supabase = req.supabase;
  const userId = req.user?.id;

  console.log("req.user:", req.user);

  if (!userId) {
    console.warn("❌ No userId in req.user");
    return res.status(401).json({ message: "Unauthenticated" });
  }

  try {
    console.log("🔹 Fetching profile for userId:", userId);

    // ---------------- Fetch profile ----------------
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
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
    }

    if (!profile) {
      console.warn("❌ Profile not found for userId:", userId);
      return res.status(404).json({ message: "Profile not found" });
    }

    console.log("✅ Profile fetched:", profile);

    const profileId = profile.id; // always use actual profile.id

    // ---------------- Fetch membership ----------------
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("role_name, active")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (memberError) {
      console.error("❌ Member fetch error:", memberError);
    }

    // ---------------- Fetch contributions ----------------
    const { data: contributions, error: contribError } = await supabase
      .from("member_giving_summary")
      .select(`
        fund_name,
        year,
        total_amount,
        yearly_total,
        overall_total
      `)
      .eq("profile_id", profileId);

    if (contribError) {
      console.error("❌ Contributions fetch error:", contribError);
    }

    const isMember = !!profile.is_member;

    // ---------------- Respond ----------------
    return res.json({
      profile: {
        id: profile.id,
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
    console.error("❌ GET /profile unexpected error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

export default router;
