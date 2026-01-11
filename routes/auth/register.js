// backend/routes/auth/register.js
import express from "express";
import { supabase } from "../../supabaseClient.js"; // service role client
import crypto from "crypto";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const { full_name, email, password, church_name } = req.body;

  if (!full_name || !email || !password || !church_name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1️⃣ Ensure church exists
    let { data: church } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .single();

    if (!church) {
      const { data: newChurch } = await supabase
        .from("churches")
        .insert([{ name: church_name.trim() }])
        .select("*")
        .single();
      church = newChurch;
    }

    // 2️⃣ Determine role
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("church_id", church.id);

    const role_name = count === 0 ? "Admin" : "Member";

    const { data: role } = await supabase
      .from("roles")
      .select("*")
      .eq("name", role_name)
      .single();

    if (!role) throw new Error("Role not found");

    // 3️⃣ Create the Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError) throw authError;

    const userId = authUser.id;

    // 4️⃣ Create profile (without password_hash)
    const email_token = crypto.randomBytes(32).toString("hex");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: userId, // must match auth user
          full_name,
          email,
          role_id: role.id,
          church_id: church.id,
          email_token,
          email_confirmed_at: null, // still falsey until verified
        },
      ])
      .select("*")
      .single();

    if (profileError) throw profileError;

    res.status(201).json({
      message: "Registration successful! Please verify your email.",
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: role_name,
        church: church.name,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

export default router;
