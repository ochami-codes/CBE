// backend/routes/auth/register.js
import express from "express";
import bcrypt from "bcryptjs";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const supabase = req.supabase; // make sure your supabase client is attached to req
  const { email, password, full_name, church_name } = req.body;

  if (!email || !password || !full_name || !church_name) {
    return res.status(400).json({
      error: "Email, password, full name, and church name are required",
    });
  }

  try {
    // 1️⃣ Check if church exists by name
    let { data: church, error: churchError } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .single();

    if (churchError || !church) {
      // Church doesn’t exist → create new one
      const { data: newChurch, error: createError } = await supabase
        .from("churches")
        .insert([{ name: church_name.trim() }])
        .select("*")
        .single();
      if (createError) throw createError;
      church = newChurch;
    }

    const church_id = church.id;

    // 2️⃣ Count existing users in this church
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("church_id", church_id);

    const role_name = count === 0 ? "Admin" : "Member";

    // 3️⃣ Get role ID
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role_name)
      .single();
    if (roleError || !role) throw new Error("Role not found");

    // 4️⃣ Hash password
    const password_hash = bcrypt.hashSync(password, 10);

    // 5️⃣ Create user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          full_name,
          email,
          password_hash,
          role_id: role.id,
          church_id,
          email_confirmed_at: false, // must verify email
        },
      ])
      .select("*")
      .single();

    if (profileError) throw profileError;

    // 6️⃣ Generate a simple email verification token
    const email_token = Math.random().toString(36).substring(2, 15);
    await supabase
      .from("profiles")
      .update({ email_token })
      .eq("id", profile.id);

    // TODO: Send verification email with email_token

    // ✅ Safe response
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
