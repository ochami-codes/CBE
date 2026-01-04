import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Make donation
router.post('/', async (req, res) => {
    const { amount, message } = req.body;
    const { data, error } = await req.supabase.from('donations').insert([{ user_id: req.user.id, amount, message }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// List donations
router.get('/', async (req, res) => {
    const { data, error } = await req.supabase.from('donations').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
