import express from 'express';
import { register, login, generateNewApiKey, getProfile } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/api-key', authenticateToken, generateNewApiKey);
router.get('/profile', authenticateToken, getProfile);

export default router;