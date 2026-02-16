import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 *
 * Single auth resolution endpoint for AuthContext
 * - Guest (signed in, not approved)
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

    /* ------------------------
       1️⃣ Validate Supabase token
    ------------------------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    /* ------------------------
       2️⃣ Fetch profile (+ church) + member + membership request
       Run in parallel to avoid slow spinner
    ------------------------- */
    const [
      profileRes,
      memberRes,
      membershipReqRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, role_name, church_id, church:church_id(name)")
        .eq("id", authUser.id)
        .maybeSingle(),

      supabaseAdmin
        .from("member_full")
        .select("id, role_name, active")
        .eq("id", authUser.id)
        .maybeSingle(),

      supabaseAdmin
        .from("membership_requests")
        .select("status")
        .eq("profile_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      console.error("profile fetch error:", profileRes.error);
      return res.status(500).json({ user: null });
    }

    if (memberRes.error) {
      console.error("member fetch error:", memberRes.error);
      return res.status(500).json({ user: null });
    }

    const profile = profileRes.data;
    const member = memberRes.data;
    const membershipRequest = membershipReqRes.data;

    /* ------------------------
       3️⃣ Derived flags & values
    ------------------------- */
    const isMember = !!member;
    const isActive = member?.active !== false;

    const roleName =
      member?.role_name ||
      profile?.role_name ||
      "Guest";

    const churchId = profile?.church_id || null;
    const churchName = profile?.church?.name || null;

    if (member && !isActive) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    /* ------------------------
       4️⃣ Unified response for AuthContext
    ------------------------- */
    return res.status(200).json({
      user: {
        id: authUser.id,
        email: authUser.email,
        full_name:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "Guest",

        role_name: roleName,

        church_id: churchId,
        church_name: churchName,

        active: true,
        is_member: isMember,
        membership_status: isMember
          ? "approved"
          : membershipRequest?.status ?? "none",
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
