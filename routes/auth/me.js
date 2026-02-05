import express from "express";
import { supabaseAdmin, supabaseAuth } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 * Returns the authenticated user, if token is valid.
 */
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    // Get the user from Supabase auth
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    // Fetch the member from the members table using members.id
    const { data, error } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        full_name,
        role_name,
        active,
        church_id,
        profiles (
          email
        )
      `)
      .eq("id", authUser.id) // ✅ Use id, not profile_id
      .single();

    if (error || !data) {
      // Fallback: return basic auth info if members row missing
      return res.status(200).json({
        user: {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || "Child of God",
          role_name: "Member",
          active: true,
        },
      });
    }

    if (data.active === false) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    // Success: return combined member info
    return res.status(200).json({
      user: {
        id: data.id,
        email: data.profiles?.email ?? authUser.email,
        full_name: data.full_name,
        church_id: data.church_id,
        role_name: data.role_name || "Member",
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
