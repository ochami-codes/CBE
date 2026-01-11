// backend/routes/auth/register.js
import express from "express";
import bcrypt from "bcryptjs";

const router = express.Router();

// POST /auth/register
router.post("/", async (req, res) => {
  const supabase = req.supabase; // your supabase client attached to req
  const { email, password, full_name, church_name } = req.body;

  if (!email || !password || !full_name || !church_name) {
    return res.status(400).json({
      error: "Email, password, full name, and church name are required",
    });
  }

  try {
    // 1️⃣ Create Auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // optional: user must verify email
    });

    if (authError || !authUser) {
      console.error("Auth creation failed:", authError);
      return res.status(500).json({ error: "Failed to create Auth user" });
    }

    const userId = authUser.id;

    // 2️⃣ Check if church exists
    let { data: church, error: churchError } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .single();

    if (churchError || !church) {
      // Create new church
      const { data: newChurch, error: createError } = await supabase
        .from("churches")
        .insert([{ name: church_name.trim() }])
        .select("*")
        .single();
      if (createError) throw createError;
      church = newChurch;
    }

    const church_id = church.id;

    // 3️⃣ Count existing users in this church
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("church_id", church_id);

    const role_name = count === 0 ? "Admin" : "Member";

    // 4️⃣ Get role ID
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role_name)
      .single();
    if (roleError || !role) throw new Error("Role not found");

    // 5️⃣ Hash password for internal profile storage
    const password_hash = bcrypt.hashSync(password, 10);

    // 6️⃣ Insert profile (only after Auth succeeds!)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: userId, // use auth user ID
          email,
          full_name,
          password_hash,
          role_id: role.id,
          church_id,
          email_confirmed_at: false, // optional
        },
      ])
      .select("*")
      .single();

    if (profileError) {
      console.error("Profile insert failed:", profileError);

      // Optional: delete auth user to avoid dangling auth accounts
      await supabase.auth.admin.deleteUser(userId);

      return res.status(500).json({
        error: "Failed to create user profile. Auth rolled back.",
      });
    }

    // 7️⃣ Optional: generate email verification token
    const email_token = Math.random().toString(36).substring(2, 15);
    await supabase
      .from("profiles")
      .update({ email_token })
      .eq("id", userId);

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

    // If Auth user was partially created, optionally delete it
    return res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

export default router;
