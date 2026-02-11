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
       1️⃣ Fetch profile (source of truth)
    ---------------------------------- */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    /* ---------------------------------
       2️⃣ Optional membership (VIEW)
    ---------------------------------- */
    const { data: member } = await supabase
      .from("member_full")
      .select(`
        role_name,
        active,
        church_id
      `)
      .eq("profile_id", userId)
      .maybeSingle();

    /* ---------------------------------
       3️⃣ Giving summary (VIEW)
    ---------------------------------- */
    const { data: contributions, error: givingError } = await supabase
      .from("member_giving_summary")
      .select(`
        fund_name,
        year,
        total_amount,
        yearly_total,
        overall_total
      `)
      .eq("profile_id", userId);

    if (givingError) {
      console.error("Giving summary error:", givingError);
    }

    /* ---------------------------------
       4️⃣ Respond
    ---------------------------------- */
    return res.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone || null,
        email: profile.email || null,
        role_name: member?.role_name || "Guest",
        active: member?.active ?? true,
        church_id: member?.church_id || null,
        is_member: !!member,
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

/* --------------------------------------------------
   PUT /profile
-------------------------------------------------- */
router.put("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    if (!full_name && !phone) {
      return res.status(400).json({
        message: "No updates provided",
      });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        ...(full_name && { full_name }),
        ...(phone && { phone }),
      })
      .eq("id", userId);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error("PUT /profile error:", err);
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
});

export default router;
