import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import { generateToken, generateApiKey, revokeApiKey } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
const validEmail = (value: unknown): value is string => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const register = async (req: Request, res: Response): Promise<void> => {
 const { email, password, name } = req.body ?? {};
 if (!validEmail(email) || typeof password !== 'string' || password.length < 12 || password.length > 128 || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
  res.status(400).json({ error: 'Provide a valid email, a 12-128 character password, and a 2-100 character name.' }); return;
 }
 const normalizedEmail = email.toLowerCase().trim();
 try {
  if (await User.findOne({ email: normalizedEmail }).select('_id')) { res.status(409).json({ error: 'User already exists' }); return; }
  const user = await User.create({ email: normalizedEmail, password: await bcrypt.hash(password, 12), name: name.trim() });
  const token = generateToken({ userId: String(user._id), email: user.email });
  res.status(201).json({ message: 'User created successfully', token, user: { id: user._id, email: user.email, name: user.name } });
 } catch (error) {
  if ((error as { code?: number }).code === 11000) { res.status(409).json({ error: 'User already exists' }); return; }
  throw error;
 }
};
export const login = async (req: Request, res: Response): Promise<void> => {
 const { email, password } = req.body ?? {};
 if (!validEmail(email) || typeof password !== 'string' || password.length > 128) { res.status(400).json({ error: 'Valid email and password are required' }); return; }
 const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
 if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) { res.status(401).json({ error: 'Invalid credentials' }); return; }
 const token = generateToken({ userId: String(user._id), email: user.email });
 res.json({ message: 'Login successful', token, user: { id: user._id, email: user.email, name: user.name } });
};
export const generateNewApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
 if (!req.user?.userId) { res.status(401).json({ error: 'Authentication required' }); return; }
 const apiKey = await generateApiKey(req.user.userId);
 res.status(201).json({ message: 'API key generated successfully', apiKey, createdAt: new Date() });
};
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
 if (!req.user?.userId) { res.status(401).json({ error: 'Authentication required' }); return; }
 const user = await User.findById(req.user.userId).select('email name isActive');
 if (!user) { res.status(404).json({ error: 'User not found' }); return; }
 res.json({ user: { id: user._id, email: user.email, name: user.name, isActive: user.isActive } });
};

export const revokeUserApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
 if (!req.user?.userId) { res.status(401).json({ error: 'Authentication required' }); return; }
 const { apiKey } = req.body ?? {};
 if (typeof apiKey !== 'string' || !apiKey.startsWith('tap_') || apiKey.length !== 68) {
  res.status(400).json({ error: 'A valid API key is required' }); return;
 }
 const revoked = await revokeApiKey(apiKey, req.user.userId);
 if (!revoked) { res.status(404).json({ error: 'API key not found' }); return; }
 res.status(200).json({ message: 'API key revoked successfully' });
};
