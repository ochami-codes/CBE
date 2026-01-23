// middleware/requireVerified.js
export function requireVerified(req, res, next) {
  try {
    const user = req.user;

    if (!user) {
      console.warn("Unauthorized access attempt (no user) to", req.originalUrl);
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.email_confirmed_at) {
      console.warn(`User ${user.id} attempted access without verified email`);
      return res.status(403).json({
        message: "Please verify your email before accessing this resource",
      });
    }

    // ✅ Verified, proceed
    next();
  } catch (err) {
    console.error("requireVerified middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
