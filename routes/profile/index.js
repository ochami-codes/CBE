import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const churchId = req.user.church_id;

    // 1️⃣ Profile + role + church
    const { data: profile, error: profileError } = await req.supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        email,
        roles ( id, name ),
        churches ( id, name, logo )
      `)
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // 2️⃣ Contribution summary (ledger-based)
    const { data: rows, error: ledgerError } = await req.supabase
      .from("ledger")
      .select("account, amount")
      .eq("member_id", userId)
      .eq("church_id", churchId);

    if (ledgerError) throw ledgerError;

    const contributions = {};
    rows.forEach(r => {
      contributions[r.account] =
        (contributions[r.account] || 0) + Number(r.amount);
    });

    res.json({
      profile: {
        fullName: profile.full_name,
        phone: profile.phone,
        email: profile.email,
        role: profile.roles?.name,
        church: profile.churches,
      },
      contributions,
    });

  } catch (err) {
    console.error("Profile GET error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

/* --------------------------------------------------
   PUT /profile
-------------------------------------------------- */
router.put("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, email } = req.body;

    // 1️⃣ Update profile table
    const { error: profileError } = await req.supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
      })
      .eq("id", userId);

    if (profileError) throw profileError;

    // 2️⃣ Update email via Supabase Auth (auto verification)
    if (email && email !== req.user.email) {
      const { error: authError } =
        await req.supabase.auth.updateUser({ email });

      if (authError) throw authError;
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Profile UPDATE error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
