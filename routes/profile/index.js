import express from "express";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
   Fetch profile for current user with debug logs
-------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user?.id;

    console.log("=== /profile request ===");
    console.log("Received userId from middleware:", userId);

    if (!userId) {
      console.warn("No user ID in request, unauthenticated");
      return res.status(401).json({ message: "Unauthenticated" });
    }

    /* ---------------------------------
       1️⃣ Fetch profile by id OR auth_user_id
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
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    console.log("Supabase profile query response:");
    console.log("profileError:", profileError);
    console.log("profile data:", profile);

    if (profileError) {
      return res.status(500).json({
        message: "Error fetching profile",
        error: profileError.message,
      });
    }

    if (!profile) {
      console.warn("Profile not found for userId:", userId);
      return res.status(404).json({ message: "Profile not found" });
    }

    const profileId = profile.id;
    console.log("Using actual profile.id:", profileId);

    /* ---------------------------------
       2️⃣ Fetch membership info
    ---------------------------------- */
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("role_name, active")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (memberError) {
      console.error("Error fetching member info:", memberError);
    }

    /* ---------------------------------
       3️⃣ Fetch contributions
    ---------------------------------- */
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
      console.error("Error fetching contributions:", contributionsError);
    }

    /* ---------------------------------
       4️⃣ Build response
    ---------------------------------- */
    const isMember = !!profile.is_member;

    const response = {
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
    };

    console.log("Response prepared:", response);

    return res.json(response);

  } catch (err) {
    console.error("GET /profile failed with error:", err);
    return res.status(500).json({
      message: "Failed to load profile",
      error: err.message,
    });
  }
});

export default router;
