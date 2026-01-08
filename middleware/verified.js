export function requireVerified(req, res, next) {
  try {
    // 1️⃣ authMiddleware must have already attached req.user
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Check iemaiil_confirmed_at e flag
    if (!req.user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before accessing this resource",
      });
    }

    // ✅ Verified, proceed
    next();
  } catch (err) {
    console.error("requireVerified error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
