export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔒 Must be a member
    if (!req.user.is_member) {
      return res.status(403).json({ message: "Members only" });
    }

    const userRole = req.user.role_name;

    if (!userRole) {
      return res.status(403).json({ message: "No role assigned" });
    }

    const normalizedUserRole = userRole.toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(normalizedUserRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
