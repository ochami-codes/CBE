import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =====================================================
   Middleware — Ensure Church Context Exists
===================================================== */
const requireChurch = (req, res, next) => {
  if (!req.user?.active_church_id || !req.user?.id) {
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
    const churchId = req.user.active_church_id;

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
    const churchId = req.user.active_church_id;
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
          `INSERT INTO members (profile_id, church_id, status)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [request.profile_id, churchId, "active"]
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


export default router;
