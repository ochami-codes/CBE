import { createClient } from "@supabase/supabase-js";

// Optional: we can fetch the Admin role ID from the DB dynamically
// Or set a fixed env variable if role IDs are stable
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function requireAdmin(req, res, next) {
  try {
    // 1️⃣ authMiddleware must already have run
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Option A: Compare role_id with Admin role in DB
    const { data: adminRole, error } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Admin")
      .single();

    if (error || !adminRole) {
      return res.status(500).json({ message: "Server error: Admin role not found" });
    }

    if (req.user.role_id !== adminRole.id) {
      return res.status(403).json({ message: "Admins only" });
    }

    // ✅ User is admin, proceed
    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
