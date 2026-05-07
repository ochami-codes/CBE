import express from "express";
import { pool } from "../../db.js";
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { church_id } = req.body;
    const profile_id = req.user.id;

    await pool.query(
      `UPDATE profiles
       SET active_church_id = $1
       WHERE id = $2`,
      [church_id, profile_id]
    );

    return res.json({
      message: "Active church updated",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Failed to switch church",
    });
  }
});

export default router;
