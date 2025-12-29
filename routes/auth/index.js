// routes/auth/index.js
import express from 'express';
import login from './login.js';
import register from './register.js';

const router = express.Router();

// Mount login and register routers
router.use('/login', login);
router.use('/register', register);

export default router;
