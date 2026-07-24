import { pool } from "../db.js";
import { getRolePermissions } from "../config/roles.js";

export function authorizeDepartment(
  permission = null
) {
  return async (req, res, next) => {
    try {
      const memberId =
        req.user?.active_member_id;

      const activeChurch =
        req.user?.active_church;

      const activeChurchId =
        activeChurch?.id ??
        req.user?.active_church_id;

      const { departmentId } =
        req.params;

      /* --------------------------------
         AUTHENTICATION
      -------------------------------- */

      if (!memberId) {
        return res.status(401).json({
          message:
            "Authentication required.",
        });
      }

      /* --------------------------------
         ACTIVE CHURCH
      -------------------------------- */

      if (!activeChurchId) {
        return res.status(403).json({
          message:
            "No active church context.",
        });
      }

      /* --------------------------------
         DEPARTMENT ID
      -------------------------------- */

      if (!departmentId) {
        return res.status(400).json({
          message:
            "Department ID is required.",
        });
      }

      /* --------------------------------
         ADMIN BYPASS
      -------------------------------- */

      if (
        activeChurch?.roles?.includes(
          "admin"
        )
      ) {
        return next();
      }

      /* --------------------------------
         CHECK DEPARTMENT ROLE
      -------------------------------- */

      const { rows } =
        await pool.query(
          `
          SELECT
            r.name AS role

          FROM member_roles mr

          JOIN roles r
            ON r.id = mr.role_id

          WHERE
            mr.member_id = $1
            AND mr.department_id = $2

          LIMIT 1;
          `,
          [
            memberId,
            departmentId,
          ]
        );

      /* --------------------------------
         USER NOT IN DEPARTMENT
      -------------------------------- */

      if (!rows.length) {
        return res.status(403).json({
          message:
            "You do not have access to this department.",
        });
      }

      /* --------------------------------
         READ ACCESS ONLY
      -------------------------------- */

      if (!permission) {
        return next();
      }

      /* --------------------------------
         CHECK DEPARTMENT PERMISSION
      -------------------------------- */

      const permissions =
        getRolePermissions(
          rows[0].role
        );

      if (
        !permissions.includes(
          permission
        )
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to perform this action.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}