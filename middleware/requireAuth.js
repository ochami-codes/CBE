// middleware/requireAuth.js
export default function requireAuth(req, res, next) {
  if (!req.user) {
    console.warn("Unauthorized access attempt:", req.originalUrl);
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
