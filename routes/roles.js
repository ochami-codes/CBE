import express from "express";
import {
  ROLES,
  ROLE_PERMISSIONS,
  ALL_ROLES,
  REQUESTABLE_ROLES,
  ALL_PERMISSIONS,
  getRolePermissions,
} from "../config/roles.js";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    // ------------------------------------
    // BUILD ROLE LIST (frontend-friendly)
    // ------------------------------------
    const roles = ALL_ROLES.map((role) => ({
      name: role,
      label: ROLES[role]?.label || role,
      permissions: getRolePermissions(role),
      requestable: REQUESTABLE_ROLES.includes(role),
    }));

    // ------------------------------------
    // RESPONSE
    // ------------------------------------
    return res.status(200).json({
      roles,                 // ✅ main dropdown data
      role_labels: ROLES,    // ✅ quick lookup map
      permissions_map: ROLE_PERMISSIONS, // ✅ advanced UI use
      requestable_roles: REQUESTABLE_ROLES,
      all_roles: ALL_ROLES,
      all_permissions: ALL_PERMISSIONS,
    });

  } catch (err) {
    console.error("GET /roles error:", err);
    return res.status(500).json({
      message: "Failed to fetch roles",
    });
  }
});

export default router;
