import express from "express";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", async (req, res) => {
  console.error("=== /profile route hit ===");
  console.error("req.user:", req.user);

  const supabase = req.supabase;
  const userId = req.user?.id;

  if (!userId) {
    console.error("❌ No userId attached to request! User might be unauthenticated.");
    return res.status(401).json({ message: "Unauthenticated" });
  }

  try {
    console.error(`🔹 Fetching profile for userId: ${userId}`);

    // 1️⃣ Fetch profile by id OR auth_user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        auth_user_id,
        full_name,
        phone,
        email,
        church_id,
        is_member
      `)
      .or(`id.eq.'${userId}',auth_user_id.eq.'${userId}'`)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile fetch error:", profileError);
    }

    if (!profile) {
      console.error("❌ Profile not found for userId:", userId);
      return res.status(404).json({ message: "Profile not found" });
    }

    console.error("✅ Profile found:", profile);

    const profileId = profile.id;

    // 2️⃣ Fetch membership info
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("role_name, active")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (memberError) {
      console.error("❌ Member fetch error:", memberError);
    } else {
      console.error("🔹 Member info:", member);
    }

    // 3️⃣ Fetch contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from("member_giving_summary")
      .select(`
        fund_name,
        year,
        total_amount,
        yearly_total,
        overall_total
      `)
      .eq("profile_id", profileId);

    if (contributionsError) {
      console.error("❌ Contributions fetch error:", contributionsError);
    } else {
      console.error("🔹 Contributions count:", contributions?.length || 0);
    }

    const isMember = !!profile.is_member;

    // 4️⃣ Respond
    return res.json({
      profile: {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
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
