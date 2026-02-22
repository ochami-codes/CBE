import express from "express";
import { supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    /* ---------------------------------
       1️⃣ Extract Bearer Token
    ---------------------------------- */
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ user: null });
    }

    const token = authHeader.split(" ")[1];

    /* ---------------------------------
       2️⃣ Validate Token
    ---------------------------------- */
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(200).json({ user: null });
    }

    const profileId = authUser.id;

    /* ---------------------------------
       3️⃣ Fetch Profile (Source of Truth)
    ---------------------------------- */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          church_id,
          is_member
        `)
        .eq("id", profileId)
        .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return res.status(200).json({ user: null });
    }
    const { data: church } = await supabaseAdmin
  .from("churches")
  .select("name")
  .eq("id", profile.church_id)
  .maybeSingle();
    /* ---------------------------------
       4️⃣ Fetch Member Record (if exists)
    ---------------------------------- */
    const { data: member, error: memberError } =
      await supabaseAdmin
        .from("members")
        .select("role_name, active")
        .eq("profile_id", profileId)
        .maybeSingle();

    if (memberError) {
      console.error("Member fetch error:", memberError);
      return res.status(200).json({ user: null });
    }

    /* ---------------------------------
       5️⃣ Fetch Latest Membership Request
    ---------------------------------- */
    const { data: membershipRequest } =
      await supabaseAdmin
        .from("membership_requests")
        .select("membership_request_status")
        .eq("profile_id", profileId)
        .order("membership_requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const isMember = profile.is_member === true;

    /* ---------------------------------
       6️⃣ Return Normalized User
    ---------------------------------- */
    return res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name:
          profile.full_name ||
          authUser.email?.split("@")[0] ||
          "Guest",
        role_name: isMember
          ? member?.role_name || "Member"
          : "Guest",
        church_id: profile.church_id ?? null,
        church_name: church?.name ?? null,
        active: member?.active ?? true,
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
