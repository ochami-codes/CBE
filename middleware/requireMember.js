export function requireMember() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.is_member) {
      return res.status(403).json({ message: "Members only" });
    }

    next();
  };
}
