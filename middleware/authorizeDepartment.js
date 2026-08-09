import { pool } from "../db.js";
import {
  getRolePermissions,
  hasRole,
} from "../config/roles.js";

export function authorizeDepartment(permission = null) {
  return async (req, res, next) => {
    try {
      const memberId =
        req.user?.active_member_id;

      const activeChurch =
        req.user?.active_church;

      const activeChurchId =
        activeChurch?.id ??
        req.user?.active_church_id;

      const departmentId =
        req.params?.departmentId ??
        req.query?.departmentId;

      /* -------------------------
         AUTHENTICATION
      ------------------------- */

      if (!memberId) {
        return res.status(401).json({
          message: "Authentication required.",
        });
      }

      /* -------------------------
         ACTIVE CHURCH
      ------------------------- */

      if (!activeChurchId) {
        return res.status(403).json({
          message: "No active church context.",
        });
      }

      /* -------------------------
         DEPARTMENT ID
      ------------------------- */

      if (!departmentId) {
        return res.status(400).json({
          message: "Department ID is required.",
        });
      }

      /* -------------------------
         CHURCH ADMIN
      ------------------------- */
     if (
  hasRole(
    activeChurch?.roles ?? [],
    "admin"
  )
) {
  return next();
}

      /* -------------------------
         CHURCH-LEVEL PERMISSION
      ------------------------- */

      if (
        permission &&
        activeChurch?.permissions?.includes(
          permission
        )
      ) {
        return next();
      }

      /* -------------------------
         GET DEPARTMENT MANAGER ROLE
      ------------------------- */

      const departmentResult =
        await pool.query(
          `
          SELECT
            d.id,
            d.manager_role_id,
            r.name AS manager_role
          FROM departments d

          LEFT JOIN roles r
            ON r.id = d.manager_role_id

          WHERE
            d.id = $1
            AND d.church_id = $2
            AND d.is_active = true

          LIMIT 1
          `,
          [
            departmentId,
            activeChurchId,
          ]
        );

      /* -------------------------
         DEPARTMENT NOT FOUND
      ------------------------- */

      if (!departmentResult.rowCount) {
        return res.status(404).json({
          message:
            "Department not found.",
        });
      }

      const department =
        departmentResult.rows[0];

      /* -------------------------
         NO MANAGER ROLE
      ------------------------- */

      if (!department.manager_role_id) {
        return res.status(403).json({
          message:
            "This department does not have a manager role assigned.",
        });
      }

      /* -------------------------
         CHECK MEMBER ROLE
      ------------------------- */

      const roleResult =
        await pool.query(
          `
          SELECT
            r.name AS role

          FROM member_roles mr

          JOIN roles r
            ON r.id = mr.role_id

          WHERE
            mr.member_id = $1
            AND mr.role_id = $2

          LIMIT 1
          `,
          [
            memberId,
            department.manager_role_id,
          ]
        );

      if (!roleResult.rowCount) {
        return res.status(403).json({
          message:
            "You are not authorized to manage this department.",
        });
      }

      /* -------------------------
         NO SPECIFIC PERMISSION
      ------------------------- */

      if (!permission) {
        return next();
      }

      /* -------------------------
         ROLE PERMISSIONS
      ------------------------- */

      const role =
        roleResult.rows[0].role;

      const permissions =
        getRolePermissions(role);

      if (!permissions.includes(permission)) {
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