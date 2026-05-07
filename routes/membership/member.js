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
const churchId = req.user.active_church_id;

if (!churchId) {
  await client.query("ROLLBACK");
  return res.status(400).json({
    message: "No active church selected",
  });
}
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
const { rows: memberRows } = await client.query(
  `SELECT 1
   FROM members
   WHERE profile_id = $1
     AND church_id = $2
   LIMIT 1`,
  [userId, churchId]
);

if (memberRows.length > 0) {
  await client.query("ROLLBACK");
  return res.status(400).json({
    message: "Already a member of this church",
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
