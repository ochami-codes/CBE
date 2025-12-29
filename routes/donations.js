import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Make donation
router.post('/', authenticate, async (req, res) => {
    const { amount, message } = req.body;
    const { data, error } = await supabase.from('donations').insert([{ user_id: req.user.id, amount, message }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// List donations
router.get('/', authenticate, async (req, res) => {
    const { data, error } = await supabase.from('donations').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
