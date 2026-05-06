import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* --------------------------------------------------
   GET /profile
-------------------------------------------------- */
router.get("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const profileId = req.user?.id;

    if (!profileId) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    /* ---------------- PROFILE ---------------- */
    const profileRes = await client.query(
      `SELECT id, full_name, phone, email, active_church_id
       FROM profiles
       WHERE id = $1`,
      [profileId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const profile = profileRes.rows[0];

    /* ---------------- ACTIVE MEMBERSHIP ---------------- */
    let member = null;

    if (profile.active_church_id) {
      const memberRes = await client.query(
        `SELECT 
           m.id,
           m.status,
           array_agg(r.name) FILTER (WHERE r.name IS NOT NULL) AS roles
         FROM members m
         LEFT JOIN member_roles mr ON mr.member_id = m.id
         LEFT JOIN roles r ON r.id = mr.role_id
         WHERE m.profile_id = $1
           AND m.church_id = $2
         GROUP BY m.id, m.status`,
        [profile.id, profile.active_church_id]
      );

      member = memberRes.rows[0] || null;
    }

    /* ---------------- CONTRIBUTIONS ---------------- */
    const contribRes = await client.query(
      `SELECT fund_name, year, total_amount, yearly_total, overall_total
       FROM member_giving_summary
       WHERE profile_id = $1`,
      [profile.id]
    );

    /* ---------------- DERIVED STATE ---------------- */
    const isMember = member?.status === "active";

    /* ---------------- RESPONSE ---------------- */
    res.json({
      profile: {
        id: profile.id,
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        email: profile.email || null,

        active_church_id: profile.active_church_id,

        // 🔥 derived, not stored
        is_member: isMember,

        status: member?.status || "none",

        roles: member?.roles?.length
          ? member.roles
          : ["guest"],
      },

      contributions: contribRes.rows || [],
    });

  } catch (err) {
    console.error("❌ GET /profile error:", err);

    res.status(500).json({
      message: "Failed to load profile",
    });

  } finally {
    client.release();
  }
});

export default router;
