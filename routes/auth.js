import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashed = bcrypt.hashSync(password, 10);

    const { data, error } = await supabase.from('users').insert([{ email, password: hashed }]);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'User registered' });
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

    if (error || !data) return res.status(400).json({ message: 'User not found' });

    const match = bcrypt.compareSync(password, data.password);
    if (!match) return res.status(400).json({ message: 'Incorrect password' });

    const token = jwt.sign({ id: data.id, email: data.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

export default router;
