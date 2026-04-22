import express from "express";
import { pool } from "../../../db.js";

const router = express.Router();

/**
 * Helper: permission guard
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

/**
 * GET /admin/role-requests/pending-count
 */
router.get(
  "/",
  requirePermission("manage_roles"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const churchId = req.user.church_id;

      if (!churchId) {
        return res.status(400).json({
          error: "Missing church context",
        });
      }

      const { rows } = await client.query(
        `SELECT COUNT(*) AS count
         FROM role_requests
         WHERE role_request_status = 'pending'
           AND church_id = $1`,
        [churchId]
      );

      res.json({
        count: parseInt(rows[0].count, 10) || 0,
      });

    } catch (err) {
      console.error("Pending role requests count error:", err);

      res.status(500).json({
        error: "Failed to fetch pending role requests count",
      });

    } finally {
      client.release();
    }
  }
);

export default router;
