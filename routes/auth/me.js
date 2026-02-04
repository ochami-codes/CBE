import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";
import { supabaseAuth } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 * Soft-auth endpoint (never throws)
 */
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return res.status(200).json({ user: null });
    }

    // Source of truth: members table
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
      .eq("profile_id", user.id)
      .single();

    if (error || !data) {
      return res.status(200).json({ user: null });
    }

    if (data.active === false) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    return res.status(200).json({
      user: {
        id: data.id,
        email: data.profiles?.email ?? null,
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
