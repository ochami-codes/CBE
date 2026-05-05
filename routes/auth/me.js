import express from "express";
import { getUserContext } from "../../services/userService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const user = await getUserContext(token);

    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({
      message: "Failed to load user",
    });
  }
});

export default router;
