import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /auth/login
router.post("/", async (req, res) => {
  const supabase = req.supabase;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // 1️⃣ Fetch profile + role
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        password_hash,
        is_verified,
        church_id,
        roles ( id, name )
      `)
      .eq("email", email)
      .single();

    if (error || !profile) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 2️⃣ Block unverified emails
    if (!profile.is_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // 3️⃣ Verify password
    const match = bcrypt.compareSync(password, profile.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      {
        sub: profile.id,
        role_id: profile.roles.id,
        church_id: profile.church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5️⃣ Respond cleanly
    res.json({
      token,
      user: {
        id: profile.id,
        email: profile.email,
        role_name: profile.roles.name,
        church_id: profile.church_id,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
