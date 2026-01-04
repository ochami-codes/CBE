import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Public: list events
router.get('/', async (req, res) => {
    const { data, error } = await req.supabase.from('events').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Protected: create event
router.post('/',
 async (req, res) => {
    const { title, date, description } = req.body;
    const { data, error } = await req.supabase.from('events').insert([{ title, date, description }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
