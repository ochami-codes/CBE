import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js'; // verifies JWT

const router = express.Router();

// POST /auth/change-password
router.post('/', authMiddleware, async (req, res) => {
  const supabase = req.supabase;
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  if (!newPassword) return res.status(400).json({ message: 'New password is required' });

  try {
    // 1️⃣ If currentPassword is provided, verify it with Supabase
    if (currentPassword) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword,
      });

      if (signInError || !signInData.user) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    // 2️⃣ Update password in Supabase Auth
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;

    // 3️⃣ Optional: log out user by clearing cookies / session
    res.clearCookie('sb-access-token');
    res.clearCookie('sb-refresh-token');

    res.json({
      message: 'Password updated successfully. Please sign in again.',
      logout: true, // frontend can redirect user to login
    });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

export default router;
