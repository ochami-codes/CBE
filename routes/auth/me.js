// backend/routes/auth/me.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 * Resolves the current authenticated user:
 * - Guest (signed in, not a member)
 * - Pending member
 * - Approved member
 */
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    /* ------------------------------------------------
       1️⃣ Validate Supabase access token
    ------------------------------------------------ */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    /* ------------------------------------------------
       2️⃣ Fetch resolved member identity (VIEW)
    ------------------------------------------------ */
    const { data: member } = await supabaseAdmin
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

    /* ------------------------------------------------
       3️⃣ Membership request state (if any)
    ------------------------------------------------ */
    const { data: membershipRequest } = await supabaseAdmin
      .from("membership_requests")
      .select("status")
      .eq("profile_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    /* ------------------------------------------------
       4️⃣ Guest (not yet a member)
    ------------------------------------------------ */
    if (!member) {
      return res.status(200).json({
        user: {
          id: authUser.id,
          email: authUser.email,
          full_name:
            authUser.user_metadata?.full_name ||
            authUser.email?.split("@")[0] ||
            "Guest",
          role_name: "Guest",
          church_id: null,
          active: true,
          is_member: false,
          membership_status: membershipRequest?.status ?? "none",
        },
      });
    }

    /* ------------------------------------------------
       5️⃣ Block deactivated members
    ------------------------------------------------ */
    if (member.active === false) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    /* ------------------------------------------------
       6️⃣ Approved member
    ------------------------------------------------ */
    return res.status(200).json({
      user: {
        id: member.id,
        full_name: member.full_name,
        email: member.email,
        role_name: member.role_name,
        church_id: member.church_id,
        active: true,
        is_member: true,
        membership_status: "approved",
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
