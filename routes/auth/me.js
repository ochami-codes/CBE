import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    /* ---------------- Token Validation ---------------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    const userId = authUser.id;

    /* ---------------- Profile ---------------- */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        auth_user_id,
        full_name,
        email,
        phone,
        church_id,
        is_member
      `)
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn("No profile for auth user:", userId);
      return res.status(200).json({ user: null });
    }

    const profileId = profile.id;

    /* ---------------- Church ---------------- */
    let churchName = null;
    if (profile.church_id) {
      const { data: church } = await supabaseAdmin
        .from("churches")
        .select("name")
        .eq("id", profile.church_id)
        .maybeSingle();
      churchName = church?.name ?? null;
    }

    /* ---------------- Member with Role Join ---------------- */
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        active,
        role_id,
        role:roles!members_role_id_fkey(name)
      `)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (memberError) {
      console.error("Error fetching member info:", memberError);
      return res.status(200).json({ user: null });
    }

    const memberActive = memberData?.active ?? true;
    const roleName = memberData?.role?.name || "Member";

    if (memberActive === false) {
      return res.status(403).json({
        user: null,
        message: "Account deactivated",
      });
    }

    const isMember = !!profile.is_member;

    /* ---------------- Membership Request ---------------- */
    const { data: requests } = await supabaseAdmin
      .from("membership_requests")
      .select("membership_request_status")
      .eq("profile_id", profileId)
      .order("membership_requested_at", { ascending: false })
      .limit(1);

    const latestRequest = requests?.[0] ?? null;

    /* ---------------- Response ---------------- */
    return res.status(200).json({
      user: {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        email: profile.email,
        phone: profile.phone,
        full_name:
          profile.full_name ||
          authUser.email?.split("@")[0] ||
          "Guest",
        role_name: isMember ? roleName : "Guest",
        church_id: profile.church_id ?? null,
        church_name: churchName,
        active: memberActive,
        is_member: isMember,
        membership_status: isMember
          ? "approved"
          : latestRequest?.membership_request_status ?? "none",
      },
    });

  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
