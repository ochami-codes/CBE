// backend/routes/profile/index.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const supabase = req.supabase;
    const { id: userId, church_id } = req.user;

    /* 1️⃣ Fetch member (source of truth for role & active) */
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select(`
        id,
        full_name,
        role_name,
        active,
        profiles (
          phone,
          email
        )
      `)
      .eq("id", userId)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ message: "Member not found" });
    }

    /* 2️⃣ Contribution summary (VIEW) */
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

    /* 3️⃣ Response */
    res.json({
      profile: {
        id: member.id,
        full_name: member.full_name,
        phone: member.profiles?.phone || null,
        email: member.profiles?.email || null,
        role_name: member.role_name || "Member",
        active: member.active,
        church_id,
      },
      contributions: contributions || [],
    });
  } catch (err) {
    console.error("GET /profile error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

/* --------------------------------------------------
   PUT /profile
-------------------------------------------------- */
router.put("/", authMiddleware, async (req, res) => {
  try {
    const supabase = req.supabase;
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    if (!full_name && !phone) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        ...(full_name && { full_name }),
        ...(phone && { phone }),
      })
      .eq("id", userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("PUT /profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
