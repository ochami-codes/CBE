import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =====================================================
   Middleware — Ensure Church Context Exists
===================================================== */
const requireChurch = (req, res, next) => {
  if (!req.user?.church_id || !req.user?.id) {
    return res.status(400).json({
      message: "Church context missing",
    });
  }
  next();
};

/* =====================================================
   GET Active Membership Requests (User Requests Only)
===================================================== */
router.get("/", requireChurch, async (req, res) => {
  const client = await pool.connect();

  try {
    const churchId = req.user.church_id;

    const { rows } = await client.query(
      `SELECT
        mr.id AS membership_request_id,
        p.id AS profile_id,
        p.full_name,
        p.email,
        mr.status AS membership_status,
        mr.source AS membership_source,
        mr.membership_requested_at
       FROM membership_requests mr
       JOIN profiles p ON p.id = mr.profile_id
       WHERE mr.church_id = $1
         AND mr.source = 'user_request'
         AND mr.status = 'requested'
       ORDER BY mr.membership_requested_at DESC`,
      [churchId]
    );

    res.json({ requests: rows });

  } catch (err) {
    console.error("Fetch membership requests error:", err);
    res.status(500).json({
      message: "Failed to fetch membership requests",
    });
  } finally {
    client.release();
  }
});

// POST /:id/approve OR /:id/reject (merged logic)
router.post("/:id/review", requireChurch, async (req, res) => {
  const client = await pool.connect();

  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const churchId = req.user.church_id;
    const { action } = req.body; // 'approved' | 'rejected'

    // -----------------------------
    // 1. Validate input
    // -----------------------------
    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({
        message: "Invalid action",
      });
    }

    await client.query("BEGIN");

    // -----------------------------
    // 2. Lock & fetch request
    // -----------------------------
    const { rows } = await client.query(
      `SELECT *
       FROM membership_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Request not found",
      });
    }

    const request = rows[0];

    // -----------------------------
    // 3. Business validations
    // -----------------------------
    if (request.church_id !== churchId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Unauthorized church access",
      });
    }

    if (request.source !== "user_request") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "This is not a user membership request",
      });
    }

    if (request.status !== "requested") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Request already handled",
      });
    }

    // -----------------------------
    // 4. Update membership request
    // -----------------------------
    await client.query(
      `UPDATE membership_requests
       SET status = $1,
           acted_by = $2,
           membership_responded_at = NOW()
       WHERE id = $3`,
      [action, adminId, requestId]
    );

    // -----------------------------
    // 5. If approved → create member
    // -----------------------------
    if (action === "approved") {
      // Prevent duplicate membership (explicit check)
      const { rows: memberRows } = await client.query(
        `SELECT 1
         FROM members
         WHERE profile_id = $1
           AND church_id = $2
         LIMIT 1`,
        [request.profile_id, churchId]
      );

      if (memberRows.length === 0) {
        const { rows: insertRows } = await client.query(
          `INSERT INTO members (profile_id, church_id)
           VALUES ($1, $2)
           RETURNING id`,
          [request.profile_id, churchId]
        );

        const memberId = insertRows[0].id;

        // Assign default role
        await client.query(
          `INSERT INTO member_roles (member_id, role_id)
           SELECT $1, r.id
           FROM roles r
           WHERE LOWER(r.name) = 'member'
           ON CONFLICT DO NOTHING`,
          [memberId]
        );
      }

      // Update profile
      await client.query(
        `UPDATE profiles
         SET is_member = true,
             church_id = $1
         WHERE id = $2`,
        [churchId, request.profile_id]
      );
    }

    // -----------------------------
    // 6. Notify user
    // -----------------------------
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
      VALUES (
        $1,
        $2,
        CASE
          WHEN $3 = 'approved' THEN 'membership_approved'
          ELSE 'membership_rejected'
        END,
        CASE
          WHEN $3 = 'approved' THEN 'Membership Approved'
          ELSE 'Membership Rejected'
        END,
        CASE
          WHEN $3 = 'approved'
            THEN 'Your membership request has been approved.'
          ELSE 'Your membership request has been rejected.'
        END,
        $4,
        'membership_request',
        false,
        NOW()
      )`,
      [request.profile_id, churchId, action, requestId]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      action,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Admin review error:", err);

    res.status(500).json({
      message: err.message || "Review failed",
    });

  } finally {
    client.release();
  }
});
// POST /invite/:id
router.post("/invite/:id", requireChurch, async (req, res) => {
  const client = await pool.connect();

  try {
    const profileId = req.params.id;
    const adminId = req.user.id;
    const churchId = req.user.church_id;

    if (!adminId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    await client.query("BEGIN");

    // -----------------------------
    // 1. Prevent inviting if already a member
    // -----------------------------
    const { rows: memberRows } = await client.query(
      `SELECT 1
       FROM members
       WHERE profile_id = $1
         AND church_id = $2
       LIMIT 1`,
      [profileId, churchId]
    );

    if (memberRows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Already a member",
      });
    }

    // -----------------------------
    // 2. Lock existing workflow (if any)
    // -----------------------------
    const { rows: existingRows } = await client.query(
      `SELECT *
       FROM membership_requests
       WHERE profile_id = $1
         AND church_id = $2
       FOR UPDATE`,
      [profileId, churchId]
    );

    let requestId;

    if (existingRows.length > 0) {
      const existing = existingRows[0];

      // -----------------------------
      // 2A. Active workflow exists → block
      // -----------------------------
      if (["requested", "invited"].includes(existing.status)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Membership workflow already active",
        });
      }

      // -----------------------------
      // 2B. Reopen rejected workflow
      // -----------------------------
      await client.query(
        `UPDATE membership_requests
         SET source = 'admin_invite',
             status = 'invited',
             acted_by = $1,
             membership_requested_at = NOW(),
             membership_responded_at = NULL
         WHERE id = $2`,
        [adminId, existing.id]
      );

      requestId = existing.id;

    } else {
      // -----------------------------
      // 3. Create new invite workflow
      // -----------------------------
      const { rows: insertRows } = await client.query(
        `INSERT INTO membership_requests (
          profile_id,
          church_id,
          source,
          status,
          acted_by,
          membership_requested_at
        )
        VALUES ($1, $2, 'admin_invite', 'invited', $3, NOW())
        RETURNING id`,
        [profileId, churchId, adminId]
      );

      requestId = insertRows[0].id;
    }

    // -----------------------------
    // 4. Notify invited user
    // -----------------------------
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
      VALUES (
        $1,
        $2,
        'membership_invite',
        'Church Invitation',
        'You have been invited to join a church.',
        $3,
        'membership_request',
        false,
        NOW()
      )`,
      [profileId, churchId, requestId]
    );

    // -----------------------------
    // 5. Notify admins (optional but consistent)
    // -----------------------------
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
        p.id,
        $1,
        'membership_invite_sent',
        'Invitation Sent',
        'A church invitation has been sent to a user.',
        $2,
        'membership_request',
        false,
        NOW()
      FROM profiles p
      JOIN members m ON m.profile_id = p.id
      JOIN member_roles mr ON mr.member_id = m.id
      JOIN roles r ON r.id = mr.role_id
      WHERE LOWER(r.name) = 'admin'
        AND m.church_id = $1`,
      [churchId, requestId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      requestId,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Invite error:", err);

    res.status(500).json({
      message: err.message || "Failed to send invite",
    });

  } finally {
    client.release();
  }
});

/* =====================================================
   GET /non-members
===================================================== */
router.get("/non-members", requireChurch, async (req, res) => {
  const client = await pool.connect();

  try {
    const churchId = req.user.church_id;

    const { rows } = await client.query(
      `SELECT
  p.id AS profile_id,
  p.full_name,
  p.email,
  p.phone,
  p.is_member,

  mr.status AS membership_status,
  mr.id AS request_id

FROM profiles p

LEFT JOIN membership_requests mr
  ON mr.profile_id = p.id
  AND mr.church_id = p.church_id
  AND mr.status = 'invited' -- optional: only active requests

WHERE p.church_id = $1
  AND p.is_member = false

ORDER BY p.full_name ASC`,
      [churchId]
    );

    res.json({ non_members: rows });

  } catch (err) {
    console.error("Fetch non-members error:", err);
    res.status(500).json({
      message: "Failed to fetch non-members",
    });
  } finally {
    client.release();
  }
});

export default router;
