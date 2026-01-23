// middleware/requireAdmin.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function requireAdmin(req, res, next) {
  try {
    // 1️⃣ Ensure authMiddleware has run
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Fetch Admin role ID dynamically
    const { data: adminRole, error } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Admin")
      .single();

    if (error || !adminRole) {
      console.error("Admin role fetch error:", error);
      return res.status(500).json({ message: "Server error: Admin role not found" });
    }

    // 3️⃣ Verify user's role
    if (req.user.role_id !== adminRole.id) {
      return res.status(403).json({ message: "Admins only" });
    }

    // ✅ User is admin, proceed
    next();
  } catch (err) {
    console.error("requireAdmin middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
