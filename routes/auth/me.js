import express from 'express';
const router = express.Router();

// GET /auth/me
router.get('/', async (req, res) => {
  const supabase = req.supabase;

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(200).json({ user: null });

    // Fetch profile + role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, role_id, church_id')
      .eq('id', userId)
      .single();

    if (error || !profile) return res.status(200).json({ user: null });

    res.json({ user: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ user: null });
  }
});

export default router;
