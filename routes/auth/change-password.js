import express from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../../middleware/authMiddleware.js'; // ensure your auth middleware
const router = express.Router();

// POST /auth/change-password
router.post('/', authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  if (!newPassword) return res.status(400).json({ message: 'New password is required' });

  try {
    // 1️⃣ Fetch the current user
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !profile) return res.status(404).json({ message: 'User not found' });

    // 2️⃣ Verify current password if provided
    if (currentPassword && !bcrypt.compareSync(currentPassword, profile.password_hash)) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // 3️⃣ Hash new password
    const password_hash = bcrypt.hashSync(newPassword, 10);

    // 4️⃣ Update password in DB
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 5️⃣ Invalidate session by clearing cookies (if using httpOnly cookies)
    res.clearCookie('session'); // adjust cookie name to your setup

    res.json({
      message: 'Password updated successfully. Please sign in again.',
      logout: true, // optional flag your frontend can use
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
