import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      return res.status(200).json({
        user: req.user,
      });
    } catch (err) {
      console.error("GET /auth/me error:", err);

      return res.status(500).json({
        message: "Failed to load user",
      });
    }
  }
);

export default router;
