import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =====================================================
   Helper: Role Management Access
===================================================== */
function requireRoleManagement(req, res) {
  const { permissions = [], is_member } = req.user || {};

  if (!is_member) {
    return res.status(403).json({ message: "Members only" });
  }

  if (!permissions.includes("manage_roles")) {
    return res.status(403).json({
      message: "You don't have permission to manage roles",
    });
  }

  return true;
}

/**
 * GET /admin/role-requests
 */

router.get("/", async (req, res) => {
  if (!requireRoleManagement(req, res)) return;

  const client = await pool.connect();

  try {
    const churchId = req.user.church_id;

    const { rows } = await client.query(
      `
      SELECT
        rr.id,
        rr.requested_role,
        rr.role_request_status,
        rr.role_requested_at,

        -- target member (who the role is for)
        target_profile.full_name AS target_full_name,
        target_profile.email AS target_email,

        -- requester (who made the request)
        requester_profile.id AS requester_id,
        requester_profile.full_name AS requester_name,
        requester_profile.email AS requester_email

      FROM role_requests rr

      -- member being assigned role
      JOIN members m ON m.id = rr.member_id
      JOIN profiles target_profile ON target_profile.id = m.profile_id

      -- person who made request
      JOIN profiles requester_profile ON requester_profile.id = rr.requested_by

      WHERE rr.church_id = $1
        AND rr.role_request_status = 'pending'

      ORDER BY rr.role_requested_at DESC
      `,
      [churchId]
    );

    const requests = rows.map((r) => ({
      id: r.id,
      requested_role: r.requested_role,
      role_request_status: r.role_request_status,
      role_requested_at: r.role_requested_at,

      target_user: {
        full_name: r.target_full_name,
        email: r.target_email,
      },

      requester: {
        id: r.requester_id,
        full_name: r.requester_name,
        email: r.requester_email,
      },
    }));

    res.json({ requests });

  } catch (err) {
    console.error("Fetch role requests error:", err);

    res.status(500).json({
      error: err.message || "Failed to load role requests",
    });
  } finally {
    client.release();
  }
});
// Approve or reject
router.post("/:id/review", async (req, res) => {
  if (!requireRoleManagement(req, res)) return;

  const client = await pool.connect();

  try {
    const requestId = req.params.id;
    const adminProfileId = req.user.id;
    const churchId = req.user.church_id;
    const { action } = req.body; // 'approved' | 'rejected'

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    await client.query("BEGIN");

    // ------------------------------------
    // 1️⃣ Get admin member id
    // ------------------------------------
    const adminRes = await client.query(
      `SELECT id
       FROM members
       WHERE profile_id = $1
         AND church_id = $2
       LIMIT 1`,
      [adminProfileId, churchId]
    );

    if (adminRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Admin is not a valid member",
      });
    }

    const adminMemberId = adminRes.rows[0].id;

    // ------------------------------------
    // 2️⃣ Lock request
    // ------------------------------------
    const reqRes = await client.query(
      `SELECT *
       FROM role_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (reqRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Role request not found",
      });
    }

    const request = reqRes.rows[0];

    if (request.role_request_status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Request already handled",
      });
    }

    // ------------------------------------
    // 3️⃣ APPROVAL → assign role
    // ------------------------------------
    if (action === "approved") {
      // get role id
      const roleRes = await client.query(
        `SELECT id
         FROM roles
         WHERE LOWER(name) = LOWER($1)
         LIMIT 1`,
        [request.requested_role]
      );

      if (roleRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          error: "Role not found",
        });
      }

      const roleId = roleRes.rows[0].id;

      // attach role
      await client.query(
        `INSERT INTO member_roles (member_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [request.member_id, roleId]
      );
    }

    // ------------------------------------
    // 4️⃣ Update request
    // ------------------------------------
    await client.query(
      `UPDATE role_requests
       SET role_request_status = $1,
           role_reviewed_at = NOW(),
           role_reviewed_by = $2
       WHERE id = $3`,
      [action, adminMemberId, requestId]
    );

    // ------------------------------------
    // 5️⃣ Notify user
    // ------------------------------------
    const profileRes = await client.query(
      `SELECT profile_id
       FROM members
       WHERE id = $1`,
      [request.member_id]
    );

    const targetProfileId = profileRes.rows[0]?.profile_id;

    if (targetProfileId) {
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
            WHEN $3 = 'approved' THEN 'role_request_approved'
            ELSE 'role_request_rejected'
          END,
          CASE
            WHEN $3 = 'approved' THEN 'Role Approved'
            ELSE 'Role Rejected'
          END,
          CASE
            WHEN $3 = 'approved'
              THEN 'Your role request has been approved.'
            ELSE 'Your role request has been rejected.'
          END,
          $4,
          'role_request',
          false,
          NOW()
        )`,
        [targetProfileId, churchId, action, requestId]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      action,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Role review error:", err);

    res.status(500).json({
      error: err.message || "Failed to process role request",
    });

  } finally {
    client.release();
  }
});
/**
 * PUT /admin/role-requests/members/:id/role
 * Directly update a member's role (admin action)
 */
router.put("/members/:id/role", async (req, res) => {
  if (!requireRoleManagement(req, res)) return;

  const client = await pool.connect();

  try {
    const memberId = req.params.id;
    const { role_name } = req.body;

    if (!role_name) {
      return res.status(400).json({ error: "Role is required" });
    }

    // get role id
    const roleRes = await client.query(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER($1)`,
      [role_name]
    );

    if (roleRes.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    const roleId = roleRes.rows[0].id;

    // attach role
    await client.query(
      `INSERT INTO member_roles (member_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [memberId, roleId]
    );

    res.json({ message: "Role assigned successfully" });

  } catch (err) {
    console.error("Manual role update error:", err);
    res.status(500).json({
      error: "Failed to update role",
    });
  } finally {
    client.release();
  }
});
export default router;
