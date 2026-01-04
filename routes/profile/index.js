import express from "express";

const router = express.Router();

// GET /profile
router.get("/", async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // Fetch contributions
    const { data: contributions, error: contribError } = await supabase
      .from("contributions")
      .select("type, amount")
      .eq("user_id", userId);

    if (contribError) throw contribError;

    // Aggregate contributions
    const summary = {
      tithes: 0,
      offerings: 0,
      campOfferings: 0,
      churchDevelopment: 0,
    };

    contributions.forEach((c) => {
      if (summary[c.type] !== undefined) {
        summary[c.type] += Number(c.amount || 0);
      }
    });

    res.json({
      profile: {
        fullName: profile.full_name,
        phone: profile.phone,
        email: req.user.email,
      },
      contributions: summary,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: err.message });
  }
});

// PUT /profile
router.put("/", async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    const { error } = await req.supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
      })
      .eq("id", req.user.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
