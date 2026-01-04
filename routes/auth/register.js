import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const router = express.Router();

// POST /auth/register
router.post('/', async (req, res) => {
  const supabase = req.supabase;
  const { email, password, role_id, church_id } = req.body;

  if (!email || !password || !church_id || !role_id) {
    return res.status(400).json({ error: 'Email, password, role_id, and church_id are required.' });
  }

  try {
    // 1️⃣ Hash password
    const password_hash = bcrypt.hashSync(password, 10);

    // 2️⃣ Create profile row (users table optional if using Supabase auth)
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert([{ email, password_hash, role_id, church_id }])
      .select('*')
      .single();

    if (error) throw error;

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      {
        sub: profile.id,
        role_id: profile.role_id,
        church_id: profile.church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token, user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

export default router;
