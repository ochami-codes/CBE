import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Public: list events
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('events').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Protected: create event
router.post('/', authenticate, async (req, res) => {
    const { title, date, description } = req.body;
    const { data, error } = await supabase.from('events').insert([{ title, date, description }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
