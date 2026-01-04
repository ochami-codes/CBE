import express from "express";
const router = express.Router();

// POST /auth/logout
router.post("/", (req, res) => {
  // Clear any client-side stored tokens (cookies or local storage)
  // Here, just return success
  res.json({ message: "Logged out successfully." });
});

export default router;
