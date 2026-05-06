import express from "express";
import { pool } from "../../db.js";
import { getOrCreateChurch } from "../../services/churchService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const { church_name, conference_id } = req.body;
    const profile_id = req.user?.id; // ✅ from auth middleware

    if (!church_name || !conference_id) {
      return res.status(400).json({
        message: "church_name and conference_id are required",
      });
    }

    if (!profile_id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    await client.query("BEGIN");

    /* ---------------- CHURCH ---------------- */
    const church = await getOrCreateChurch({
      client,
      church_name,
      conference_id,
    });

    /* ---------------- CHECK EXISTING MEMBERS ---------------- */
    const countRes = await client.query(
      `SELECT COUNT(*) FROM members WHERE church_id = $1`,
      [church.id]
    );

    const memberCount = Number(countRes.rows[0].count);
    const isFirstUser = memberCount === 0;

    /* ---------------- FIRST USER → ADMIN ---------------- */
    if (isFirstUser) {
      const memberRes = await client.query(
        `INSERT INTO members (profile_id, church_id, status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [profile_id, church.id]
      );

      const member = memberRes.rows[0];

      const roleRes = await client.query(
        `SELECT id FROM roles
         WHERE LOWER(name) = 'admin'
         LIMIT 1`
      );

      const adminRoleId = roleRes.rows[0]?.id;

      if (adminRoleId) {
        await client.query(
          `INSERT INTO member_roles (member_id, role_id)
           VALUES ($1, $2)`,
          [member.id, adminRoleId]
        );
      }
    }

    /* ---------------- UPDATE ACTIVE CHURCH ---------------- */
    await client.query(
      `UPDATE profiles
       SET active_church_id = $1
       WHERE id = $2`,
      [church.id, profile_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: isFirstUser
        ? "Church created. You are the Admin."
        : "Church selected. You are a guest.",
      church,
      role: isFirstUser ? "admin" : "guest",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Create church error:", err);

    return res.status(500).json({
      message: err.message || "Failed to process church request",
    });
  } finally {
    client.release();
  }
});

export default router;
