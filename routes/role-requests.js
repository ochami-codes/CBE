import express from "express";
import { pool } from "../db.js";
import {
  normalizeRole,
  isValidRole,
  REQUESTABLE_ROLES,
} from "../config/roles.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    let { requested_role } = req.body;
    const { member_id, church_id, is_member } = req.user;

    // ------------------------------------
    // VALIDATIONS
    // ------------------------------------
    if (!is_member) {
      return res.status(403).json({
        error: "Only members can request roles",
      });
    }

    if (!member_id) {
      return res.status(400).json({
        error: "Member record not found",
      });
    }

    if (!church_id) {
      return res.status(400).json({
        error: "Church not set",
      });
    }

    if (!requested_role) {
      return res.status(400).json({
        error: "requested_role is required",
      });
    }

    requested_role = normalizeRole(requested_role);

    if (!isValidRole(requested_role)) {
      return res.status(400).json({
        error: "Invalid role",
      });
    }

    if (!REQUESTABLE_ROLES.includes(requested_role)) {
      return res.status(403).json({
        error: "You cannot request this role",
      });
    }

    await client.query("BEGIN");

    // ------------------------------------
    // 1️⃣ Prevent duplicate pending request
    // ------------------------------------
    const existing = await client.query(
      `SELECT 1
       FROM role_requests
       WHERE member_id = $1
         AND requested_role = $2
         AND role_request_status = 'pending'
       LIMIT 1`,
      [member_id, requested_role]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "You already have a pending request for this role",
      });
    }

    // ------------------------------------
    // 2️⃣ Create request
    // ------------------------------------
    const insertRes = await client.query(
      `INSERT INTO role_requests (
        member_id,
        requested_by,
        requested_role,
        church_id,
        role_request_status,
        role_requested_at
      )
      VALUES ($1, $1, $2, $3, 'pending', NOW())
      RETURNING *`,
      [member_id, requested_role, church_id]
    );

    const request = insertRes.rows[0];

    // ------------------------------------
    // 3️⃣ Notify admins (NEW schema)
    // ------------------------------------
    await client.query(
      `INSERT INTO notifications (
        user_id,
        church_id,
        type,
        title,
        message,
        related_id,
        related_type,
        is_read,
        created_at
      )
      SELECT
        m.profile_id,
        $1,
        'role_request',
        'New Role Request',
        'A member requested the role ' || $2,
        $3,
        'role_request',
        false,
        NOW()
      FROM members m
      JOIN member_roles mr ON mr.member_id = m.id
      JOIN roles r ON r.id = mr.role_id
      WHERE m.church_id = $1
        AND LOWER(r.name) = 'admin'
        AND m.status = 'active'`,
      [church_id, requested_role, request.id]
    );

    await client.query("COMMIT");

    res.status(201).json(request);

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Submit role request error:", err);

    res.status(500).json({
      error: err.message || "Failed to submit role request",
    });

  } finally {
    client.release();
  }
});

// GET
router.get("/my-requests", async (req, res) => {
  const client = await pool.connect();

  try {
    const { member_id, is_member } = req.user;

    if (!is_member) {
      return res.json({ requests: [] });
    }

    const { rows } = await client.query(
      `SELECT *
       FROM role_requests
       WHERE member_id = $1
       ORDER BY role_requested_at DESC`,
      [member_id]
    );

    res.json({ requests: rows });

  } catch (err) {
    console.error("Fetch role requests error:", err);

    res.status(500).json({
      error: "Failed to fetch your role requests",
    });

  } finally {
    client.release();
  }
});
export default router;
