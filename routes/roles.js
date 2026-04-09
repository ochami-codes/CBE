import express from "express";
import {
  ROLES,
  ALL_ROLES,
} from "../config/roles.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const roles = ALL_ROLES.map((role) => ({
      name: role,
      label: ROLES[role]?.label || role,
    }));

    return res.status(200).json({
      roles,
      all_roles: ALL_ROLES,
    });

  } catch (err) {
    console.error("GET /roles error:", err);
    return res.status(500).json({
      message: "Failed to fetch roles",
    });
  }
});

export default router;
