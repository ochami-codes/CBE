// routes/auth/register.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../../supabaseClient.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, role = 'member', church_id } = req.body;

  if (!email || !password || !church_id) {
    return res.status(400).json({ error: 'Email, password, and church_id are required' });
  }

  try {
    // 1️⃣ Create user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // 2️⃣ Create profile row
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: userId, role, church_id }])
      .single();

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    // 3️⃣ Create JWT
    const token = jwt.sign(
      {
        sub: userId,
        role,
        church_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token, user: { id: userId, email, role, church_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
