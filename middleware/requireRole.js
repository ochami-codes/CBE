// middleware/requireRole.js
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.role) {
        return res.status(401).json({ message: "Unauthorized: no role found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }

      next();
    } catch (err) {
      console.error("requireRole error:", err);
      res.status(500).json({ message: "Server error in role check" });
    }
  };
}
