// backend/routes/profile/index.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
   Returns the logged-in user's profile and contribution summary
-------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { id: userId, church_id: churchId } = req.user;
    const supabase = req.supabase;

    // 1️⃣ Fetch profile with role(s) and church(es)
    const { data: profile, error: profileError } = await supabase
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

    if (profileError || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Safely pick first role and church
    const role = profile.roles?.[0]?.name || null;
    const church = profile.churches?.[0] || null;

    // 2️⃣ Fetch contribution summary from ledger
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("ledger")
      .select("account, amount")
      .eq("member_id", userId)
      .eq("church_id", churchId);

    if (ledgerError) throw ledgerError;

    const contributions = ledgerRows.reduce((acc, row) => {
      acc[row.account] = (acc[row.account] || 0) + Number(row.amount || 0);
      return acc;
    }, {});

    res.json({
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        phone: profile.phone,
        email: profile.email,
        role,
        church,
      },
      contributions,
    });
  } catch (err) {
    console.error("GET /profile error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

/* --------------------------------------------------
   PUT /profile
   Updates the logged-in user's profile
-------------------------------------------------- */
router.put("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const supabase = req.supabase;
    const { fullName, phone, email } = req.body;

    if (!fullName && !phone && !email) {
      return res.status(400).json({ message: "No updates provided" });
    }

    // 1️⃣ Update profile table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        ...(fullName ? { full_name: fullName } : {}),
        ...(phone ? { phone } : {}),
      })
      .eq("id", userId);

    if (profileError) throw profileError;

    // 2️⃣ Update email via Supabase Auth if changed
    if (email && email !== req.user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email });
      if (authError) throw authError;
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("PUT /profile error:", err);
    res.status(500).json({ message: err.message || "Failed to update profile" });
  }
});

export default router;
