// routes/church/activeChurch.js
import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/**
 * SWITCH ACTIVE CHURCH
 * Sets the church context for the logged-in user
 */
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const { profile_id, church_id } = req.body;

    if (!profile_id || !church_id) {
      return res.status(400).json({
        message: "profile_id and church_id are required",
      });
    }

    await client.query("BEGIN");

    /* ---------------------------------------------
       1. VERIFY USER IS ASSOCIATED WITH THIS CHURCH
    ---------------------------------------------- */
    const memberCheck = await client.query(
      `SELECT id, status
       FROM members
       WHERE profile_id = $1
       AND church_id = $2
       LIMIT 1`,
      [profile_id, church_id]
    );

    const member = memberCheck.rows[0];

    // If no membership → treat as guest (still allowed switch)
    // but DO NOT expose member-only data later
    const isMember = !!member && member.status === "active";

    /* ---------------------------------------------
       2. UPDATE ACTIVE CHURCH
    ---------------------------------------------- */
    await client.query(
      `UPDATE profiles
       SET active_church_id = $1
       WHERE id = $2`,
      [church_id, profile_id]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Active church updated",
      active_church_id: church_id,
      is_member: isMember,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Switch church error:", err);

    return res.status(500).json({
      message: "Failed to switch active church",
    });
  } finally {
    client.release();
  }
});

export default router;
