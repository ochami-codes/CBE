import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const router = express.Router();

// POST /auth/login
router.post('/', async (req, res) => {
  const supabase = req.supabase;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  try {
    // Fetch profile with hashed password and role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, password_hash, role_id, church_id')
      .eq('email', email)
      .single();

    if (error || !profile) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check password
    const match = bcrypt.compareSync(password, profile.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    // Generate JWT
    const token = jwt.sign(
      { sub: profile.id, role_id: profile.role_id, church_id: profile.church_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: profile.id, email: profile.email, role_id: profile.role_id, church_id: profile.church_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
