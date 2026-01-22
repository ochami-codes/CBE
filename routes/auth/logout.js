import express from "express";
import requireAuth from "../../middleware/requireAuth.js";

const router = express.Router();

// POST /auth/logout
router.post("/", requireAuth, (req, res) => {
  /**
   * JWT logout is handled on the client by deleting the token.
   * This endpoint exists for symmetry, auditing, or future token revocation.
   */
  return res.json({
    message: "Logged out successfully",
  });
});

export default router;
