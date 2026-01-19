import express from "express";

const router = express.Router();

// POST /auth/logout
router.post("/", async (req, res) => {
  try {
    // If you're using httpOnly cookies (recommended)
    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({
      error: "Failed to logout",
    });
  }
});

export default router;
