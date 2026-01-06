import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { email, password, full_name, church_name } = req.body;

  if (!email || !password || !full_name || !church_name) {
    return res.status(400).json({
      error: "Email, password, full_name, and church_name are required",
    });
  }

  try {
    // 1️⃣ Check if church exists
    let { data: church, error: churchError } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name)
      .single();

    if (churchError || !church) {
      // Create new church
      const { data: newChurch, error: createError } = await supabase
        .from("churches")
        .insert([{ name: church_name }])
        .select("*")
        .single();
      if (createError) throw createError;
      church = newChurch;
    }

    const church_id = church.id;

    // 2️⃣ Determine role
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

    // 5️⃣ Create profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([
        {
          email,
          full_name,
          password_hash,
          role_id: role.id,
          church_id,
          is_verified: false, // must verify email
        },
      ])
      .select("*")
      .single();
    if (error) throw error;

    // 6️⃣ Generate email verification token
    const email_token = Math.random().toString(36).substr(2, 15); // simple example
    await supabase
      .from("profiles")
      .update({ email_token })
      .eq("id", profile.id);

    // TODO: send email with verification link containing email_token

    res.status(201).json({
      message: `Registered successfully. Please verify your email.`,
      user: { id: profile.id, email: profile.email, role: role_name, church: church.name },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

export default router;
