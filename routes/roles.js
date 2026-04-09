import express from "express";
import {
  ROLES,
  ALL_ROLES,
  REQUESTABLE_ROLES,
} from "../config/roles.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const roles = ALL_ROLES.map((role) => ({
      name: role,
      label: ROLES[role]?.label || role,
      requestable: REQUESTABLE_ROLES.includes(role),
    }));

    return res.status(200).json({
      roles,
      requestable_roles: REQUESTABLE_ROLES,
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
