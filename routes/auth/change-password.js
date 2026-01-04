import express from 'express';
import bcrypt from 'bcryptjs';
const router = express.Router();

// POST /auth/change-password
router.post('/', async (req, res) => {
  const supabase = req.supabase;
  const { newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
  if (!newPassword) return res.status(400).json({ message: 'New password is required.' });

  try {
    const password_hash = bcrypt.hashSync(newPassword, 10);

    const { error } = await supabase
      .from('profiles')
      .update({ password_hash })
      .eq('id', userId);

    if (error) throw error;

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
