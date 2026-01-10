import express from "express";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { full_name, email, password, church_name } = req.body;

    if (!full_name || !email || !password || !church_name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 1️⃣ Check duplicate email
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // 2️⃣ Create Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false // Supabase sends confirmation email
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // 3️⃣ Handle church
    const { data: existingChurch } = await supabase
      .from("churches")
      .select("*")
      .eq("name", church_name.trim())
      .maybeSingle();

    let churchId;
    if (!existingChurch) {
      const { data: newChurch, error: createChurchError } = await supabase
        .from("churches")
        .insert([{ name: church_name.trim() }])
        .select("*")
        .single();

      if (createChurchError) throw createChurchError;
      churchId = newChurch.id;
    } else {
      churchId = existingChurch.id;
    }

    // 4️⃣ Assign role
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("church_id", churchId);

    const roleName = count === 0 ? "Admin" : "Member";

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (roleError || !role) {
      return res.status(500).json({ error: "Role not found" });
    }

    // 5️⃣ Insert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name,
        email,
        church_id: churchId,
        role_id: role.id
      });

    if (profileError) {
      return res.status(500).json({ error: "Profile creation failed" });
    }

    // 6️⃣ Return success
    return res.status(201).json({
      message: "Registration successful! Check your email to confirm your account.",
      user: {
        id: userId,
        full_name,
        email,
        role: roleName,
        church: church_name.trim()
      }
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
