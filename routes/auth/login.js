import express from "express";
import { supabaseAuth, supabaseAdmin } from "../../supabaseClient.js";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("[LOGIN REQUEST] Incoming:", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: {
      email: req.body?.email,
      password: req.body?.password ? "***" : undefined,
    },
    time: new Date().toISOString(),
  });
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    /* ---------------------------------
       1️⃣ Authenticate
    ---------------------------------- */
    const { data, error } =
      await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data?.user || !data?.session) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const { user, session } = data;

    /* ---------------------------------
       2️⃣ Ensure email verified
    ---------------------------------- */
    if (!user.email_confirmed_at) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    /* ---------------------------------
       3️⃣ Fetch profile
    ---------------------------------- */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
      return res.status(500).json({
        message: "Profile not found",
      });
    }

    /* ---------------------------------
       4️⃣ Fetch ALL memberships
    ---------------------------------- */
    const { data: memberships, error: memberError } =
      await supabaseAdmin
        .from("members")
        .select(`
          id,
          church_id,
          status,
          churches (
            name
          ),
          member_roles (
            roles (
              name
            )
          )
        `)
        .eq("profile_id", profile.id);

    if (memberError) {
      return res.status(500).json({
        message: "Failed to fetch memberships",
      });
    }

    /* ---------------------------------
       5️⃣ Normalize memberships
    ---------------------------------- */
    const formattedMemberships = memberships.map((m) => {
      const roles =
        m.member_roles?.map((r) => r.roles?.name) || [];

      return {
        id: m.id,
        church_id: m.church_id,
        church_name: m.churches?.name,
        status: m.status,
        roles: roles.length ? roles : ["member"],
      };
    });

    /* ---------------------------------
       6️⃣ Extract permissions/roles
    ---------------------------------- */
    const allRoles = new Set();

    formattedMemberships.forEach((m) => {
      if (m.status === "active") {
        m.roles.forEach((r) => allRoles.add(r));
      }
    });

    const roles = allRoles.size ? [...allRoles] : ["guest"];

    /* ---------------------------------
       7️⃣ Response
    ---------------------------------- */
    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,

        memberships: formattedMemberships,

        roles,
        primary_role: roles[0] || "guest",
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Server error during login",
    });
  }
});

export default router;
