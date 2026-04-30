// routes/membership/member.js
import express from "express";
import { pool } from "../../db.js";

const router = express.Router();

/* =====================================================
   Helpers
===================================================== */
const isValidAction = (action) =>
  ["accepted", "rejected"].includes(action);

/* =====================================================
   POST /membership-requests
   Logged-in user requests membership
===================================================== */
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;

    await client.query("BEGIN");

    // 1. Get user's selected church
    const { rows: profileRows } = await client.query(
      `SELECT church_id
       FROM profiles
       WHERE id = $1`,
      [userId]
    );

    const profile = profileRows[0];

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.church_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Church not selected",
      });
    }

    const churchId = profile.church_id;

    // 2. Check existing active request
    const { rows: existingRows } = await client.query(
      `SELECT id
       FROM membership_requests
       WHERE profile_id = $1
         AND church_id = $2
         AND status IN ('requested', 'invited')
       LIMIT 1`,
      [userId, churchId]
    );

    if (existingRows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "An active membership request already exists",
      });
    }

    // 3. Create request
    const { rows: insertRows } = await client.query(
      `INSERT INTO membership_requests (
        profile_id,
        church_id,
        source,
        status,
        membership_requested_at
      )
      VALUES ($1, $2, 'user_request', 'requested', NOW())
      RETURNING id`,
      [userId, churchId]
    );

    const requestId = insertRows[0].id;

    // 4. Notify admins
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
        'membership_request',
        'New Membership Request',
        'A new membership request has been submitted.',
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
      id: requestId,
      message: "Membership request created",
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Create membership request error:", err);

    res.status(500).json({
      message: err.message || "Internal server error",
    });

  } finally {
    client.release();
  }
});

/* =====================================================
   PATCH /membership-requests/:id/respond
   User responds to an admin invite
===================================================== */
router.patch("/:id/respond", async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;
    const { id: requestId } = req.params;
    const { action } = req.body;

    if (!isValidAction(action)) {
      return res.status(400).json({
        message: "Invalid action",
      });
    }

    await client.query("BEGIN");

    // 1. Lock request
    const { rows } = await client.query(
      `SELECT *
       FROM membership_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Request not found" });
    }

    const request = rows[0];

    // 2. Validate business rules
    if (request.source !== "admin_invite") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "This request is not an admin invite",
      });
    }

    if (request.profile_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    if (request.status !== "invited") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Request already handled",
      });
    }

    // 3. Update request
    await client.query(
      `UPDATE membership_requests
       SET status = $1,
           acted_by = $2,
           membership_responded_at = NOW()
       WHERE id = $3`,
      [action, userId, requestId]
    );

    // 4. If accepted → create member + role
    if (action === "accepted") {
      const { rows: memberRows } = await client.query(
  `INSERT INTO members (profile_id, church_id, status)
   VALUES ($1, $2, 'active')
   ON CONFLICT (profile_id, church_id)
   DO UPDATE SET status = 'active'
   RETURNING id`,
  [userId, request.church_id]
);

      const memberId = memberRows[0]?.id;

      await client.query(
        `UPDATE profiles
         SET is_member = true,
             church_id = $1
         WHERE id = $2`,
        [request.church_id, userId]
      );

      if (memberId) {
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

    // 5. Mark notification as read
    await client.query(
      `UPDATE notifications
       SET is_read = true,
           read_at = NOW()
       WHERE related_id = $1
         AND user_id = $2`,
      [requestId, userId]
    );

    // 6. Notify admins
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
        CASE 
          WHEN $2 = 'accepted' THEN 'membership_invite_accepted'
          ELSE 'membership_invite_rejected'
        END,
        CASE 
          WHEN $2 = 'accepted' THEN 'Invitation Accepted'
          ELSE 'Invitation Rejected'
        END,
        CASE 
          WHEN $2 = 'accepted'
            THEN 'A user has accepted the church invitation.'
          ELSE 'A user has rejected the church invitation.'
        END,
        $3,
        'membership_request',
        false,
        NOW()
      FROM profiles p
      JOIN members m ON m.profile_id = p.id
      JOIN member_roles mr ON mr.member_id = m.id
      JOIN roles r ON r.id = mr.role_id
      WHERE LOWER(r.name) = 'admin'
        AND m.church_id = $1`,
      [request.church_id, action, requestId]
    );

    await client.query("COMMIT");

    res.json({
      message: `Invitation ${action}`,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Respond invite error:", err);

    res.status(500).json({
      message: err.message || "Internal server error",
    });

  } finally {
    client.release();
  }
});
/* =====================================================
   GET /membership-requests/me
   Get current user's membership request/invite
===================================================== */
router.get("/me", async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;

    const { rows } = await client.query(
      `SELECT
        mr.id,
        mr.church_id,
        mr.source,
        mr.status,
        mr.membership_requested_at,
        mr.membership_responded_at
       FROM membership_requests mr
       WHERE mr.profile_id = $1
       ORDER BY mr.membership_requested_at DESC
       LIMIT 1`,
      [userId]
    );

    const request = rows[0] || null;

    res.json({
      membership: request,
      membership_status: request?.status || null,
      has_active_request: ["invited", "requested"].includes(request?.status),
    });

  } catch (err) {
    console.error("Fetch membership status error:", err);

    res.status(500).json({
      message: "Failed to fetch membership status",
    });

  } finally {
    client.release();
  }
});
export default router;
