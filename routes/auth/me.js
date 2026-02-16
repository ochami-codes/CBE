// backend/routes/auth/me.js
import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

/**
 * GET /auth/me
 *
 * Resolves the authenticated user into one of:
 * - Guest (signed in, no member record yet)
 * - Pending member (membership request exists)
 * - Approved member (exists in member_full)
 */
router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    /* ------------------------
       1️⃣ Validate Supabase access token
    ------------------------- */
    const { data: { user: authUser }, error: authError } =
      await supabaseAuth.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    /* ------------------------
       2️⃣ Fetch profile and linked church
    ------------------------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*, church:church_id(name)")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("profile fetch error:", profileError);
      return res.status(500).json({ user: null });
    }

    /* ------------------------
       3️⃣ Fetch approved member (optional)
       member_full = profiles + members + churches
    ------------------------- */
    const { data: member, error: memberError } = await supabaseAdmin
      .from("member_full")
      .select("id, full_name, email, role_name, active, church_id, church_name")
      .eq("id", authUser.id)
      .maybeSingle();

    if (memberError) {
      console.error("member_full fetch error:", memberError);
      return res.status(500).json({ user: null });
    }

    /* ------------------------
       4️⃣ Fetch latest membership request (if any)
    ------------------------- */
    const { data: membershipRequest } = await supabaseAdmin
      .from("membership_requests")
      .select("status")
      .eq("profile_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    /* ------------------------
       5️⃣ Assemble user object
    ------------------------- */
    const isMember = !!member;

    // Determine role_name
    const roleName = member?.role_name || profile?.role_name || "Guest";

    // Determine church
    const churchId = profile?.church_id || null;
    const churchName = profile?.church?.name || member?.church_name || null;

    // Guest / pending member
    if (!isMember) {
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
          is_member: false,
          membership_status: membershipRequest?.status ?? "none",
        },
      });
    }

    // Block deactivated members
    if (member.active === false) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    // Approved member
    return res.status(200).json({
      user: {
        id: member.id,
        full_name: member.full_name,
        email: member.email,
        role_name: roleName,
        church_id: churchId,
        church_name: churchName,
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
