import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../../supabaseClient.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  const user = data.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id')
    .eq('id', user.id)
    .single();

  const token = jwt.sign(
    {
      sub: user.id,
      role: profile?.role,
      church_id: profile?.church_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token, user });
});

export default router;
