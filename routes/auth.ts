import express from 'express';
import { register, login, generateNewApiKey, getProfile, revokeUserApiKey } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/api-key', authenticateToken, generateNewApiKey);\nrouter.post('/api-key/revoke', authenticateToken, revokeUserApiKey);
router.get('/profile', authenticateToken, getProfile);

export default router;