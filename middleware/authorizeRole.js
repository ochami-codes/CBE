// middleware/authorizeRole.js
import { ALL_ROLES } from "../config/roles.js";

export function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    // Admin shortcut: always allowed
    if (user.roles?.includes("admin")) {
      return next();
    }

    // Optional: validate that allowedRoles are actually defined in roles.js
    const validRoles = allowedRoles.filter((role) =>
      ALL_ROLES.includes(role)
    );

    // Check if user has at least one of the allowed roles
    const hasRole = user.roles?.some((role) =>
      validRoles.includes(role)
    );

    if (!hasRole) {
      return res.status(403).json({
        message: "You are not authorized to access this resource.",
      });
    }

    next();
  };
}
