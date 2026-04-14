import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  user?: any;
  apiKey?: string;
}

export interface UserPayload {
  userId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_KEYS = new Map<string, { userId: string; createdAt: Date; rateLimit: number }>();

export const generateApiKey = (userId: string): string => {
  const apiKey = crypto.randomBytes(32).toString('hex');
  API_KEYS.set(apiKey, {
    userId,
    createdAt: new Date(),
    rateLimit: 1000
  });
  return apiKey;
};

export const revokeApiKey = (apiKey: string): boolean => {
  return API_KEYS.delete(apiKey);
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user as UserPayload;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authentication token required' });
  }
};

export const authenticateApiKey = (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const keyData = API_KEYS.get(apiKey);
  if (!keyData) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  req.apiKey = apiKey;
  req.user = { userId: keyData.userId };
  next();
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const apiKey = req.headers['x-api-key'] as string;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user as UserPayload;
      }
    });
  } else if (apiKey) {
    const keyData = API_KEYS.get(apiKey);
    if (keyData) {
      req.apiKey = apiKey;
      req.user = { userId: keyData.userId };
    }
  }

  next();
};

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};