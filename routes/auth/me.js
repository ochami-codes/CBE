import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 */
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    /* ---------------------------
       1️⃣ Validate access token
    ---------------------------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    /* ---------------------------
       2️⃣ Fetch from member_full
       (single source of truth)
    ---------------------------- */
    const { data, error } = await supabaseAdmin
      .from("member_full")
      .select(`
        id,
        full_name,
        email,
        role_name,
        active,
        church_id
      `)
      .eq("id", authUser.id)
      .maybeSingle();

    // Profile exists but not a member yet
    if (!data) {
      return res.status(200).json({
        user: {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || "Guest",
          role_name: "Guest",
          church_id: null,
          active: true,
          is_member: false,
        },
      });
    }

    if (data.active === false) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    /* ---------------------------
       3️⃣ Success
    ---------------------------- */
    return res.status(200).json({
      user: {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role_name: data.role_name,
        church_id: data.church_id,
        active: data.active,
        is_member: true,
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
