import { normalizeRole } from "../config/roles.js";

export function authorize(permission) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message:
          "Authentication required.",
      });
    }

    const activeChurch =
      user.active_church;

    if (!activeChurch) {
      return res.status(403).json({
        message:
          "No active church context.",
      });
    }

    const roles =
      activeChurch.roles ?? [];

    const permissions =
      activeChurch.permissions ?? [];

    /* -------------------------
       Church Admin
    ------------------------- */

    if (
      roles.some(
        (role) =>
          normalizeRole(role) ===
          "admin"
      )
    ) {
      return next();
    }

    /* -------------------------
       Permission Check
    ------------------------- */

    if (
      permissions.includes(
        permission
      )
    ) {
      return next();
    }

    return res.status(403).json({
      message:
        "You are not authorized to perform this action.",
    });
  };
}