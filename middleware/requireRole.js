import { supabaseAdmin } from "../supabaseClient.js";

export function requireRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Fetch role name
      const { data: role, error } = await supabaseAdmin
        .from("roles")
        .select("name")
        .eq("id", req.user.role_id)
        .single();

      if (error || !role) {
        return res.status(403).json({ message: "Role not found" });
      }

      if (!allowedRoles.includes(role.name)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("requireRole error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
}
