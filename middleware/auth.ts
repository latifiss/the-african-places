import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/user.js';
export interface AuthRequest extends Request { user?: { userId: string; email?: string }; apiKey?: string }
export interface UserPayload { userId: string; email: string }
function jwtSecret(): string {
 const secret = process.env.JWT_SECRET;
 if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
 return secret;
}
const hashApiKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');
export const generateApiKey = async (userId: string): Promise<string> => {
 const user = await User.findById(userId).select('apiKeys');
 if (!user) throw new Error('User not found');
 if (user.apiKeys.length >= 10) throw new Error('Maximum of 10 active API keys reached');
 const apiKey = `tap_${crypto.randomBytes(32).toString('hex')}`;
 user.apiKeys.push({ hash: hashApiKey(apiKey), prefix: apiKey.slice(0, 12), createdAt: new Date() });
 await user.save();
 return apiKey;
};
export const revokeApiKey = async (apiKey: string, userId: string): Promise<boolean> => {
 const hash = hashApiKey(apiKey);
 const result = await User.updateOne({ _id: userId, 'apiKeys.hash': hash }, { $pull: { apiKeys: { hash } } });
 return result.modifiedCount > 0;
};
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
 const [scheme, token] = req.header('authorization')?.split(' ') ?? [];
 if (scheme?.toLowerCase() !== 'bearer' || !token) { res.status(401).json({ error: 'Authentication token required' }); return; }
 try { req.user = jwt.verify(token, jwtSecret()) as UserPayload; next(); }
 catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};
export const authenticateApiKey = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
 const apiKey = req.header('x-api-key');
 if (!apiKey) { res.status(401).json({ error: 'API key required' }); return; }
 try {
  const user = await User.findOne({ 'apiKeys.hash': hashApiKey(apiKey), isActive: true }).select('_id email');
  if (!user) { res.status(403).json({ error: 'Invalid API key' }); return; }
  req.apiKey = apiKey; req.user = { userId: String(user._id), email: user.email }; next();
 } catch (error) { next(error); }
};
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
 const [scheme, token] = req.header('authorization')?.split(' ') ?? [];
 if (scheme?.toLowerCase() === 'bearer' && token) {
  try { req.user = jwt.verify(token, jwtSecret(), { issuer: 'the-african-places-api', audience: 'the-african-places' }) as UserPayload; } catch { /* Continue anonymously. */ }
 }
 next();
};
export const generateToken = (payload: UserPayload): string => jwt.sign(payload, jwtSecret(), { expiresIn: '24h', issuer: 'the-african-places-api', audience: 'the-african-places' });

/** Accept either a signed-in user token or a persisted API key for write operations. */
export const authenticateRequest = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.header('authorization')) {
    authenticateToken(req, res, next);
    return;
  }
  void authenticateApiKey(req, res, next);
};
