import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(200).json({ user: null });
    const token = authHeader.split(" ")[1];

    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) return res.status(200).json({ user: null });

    const profileId = authUser.id;

    // Fetch profile (including is_member) and join member info
    const { data: profileData, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        church_id,
        is_member,
        member:members!members_id_fkey(role_name, active)
      `)
      .eq("id", profileId)
      .maybeSingle();

    if (error || !profileData) return res.status(200).json({ user: null });

    // Latest membership request
    const { data: membershipRequest } = await supabaseAdmin
      .from("membership_requests")
      .select("membership_request_status")
      .eq("profile_id", profileId)
      .order("membership_requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isMember = profileData.is_member === true;
    const roleName = isMember ? profileData.member?.role_name : "Guest";

    return res.status(200).json({
      user: {
        id: profileId,
        email: profileData.email,
        full_name: profileData.full_name || authUser.email.split("@")[0] || "Guest",
        role_name: roleName,
        church_id: profileData.church_id,
        church_name: null, // optional: fetch church name separately if needed
        active: profileData.member?.active ?? true,
        is_member: isMember,
        membership_status: isMember
          ? "approved"
          : membershipRequest?.membership_request_status ?? "none",
      },
    });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(200).json({ user: null });
  }
});

export default router;
