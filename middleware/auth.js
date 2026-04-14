import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const API_KEYS = new Map();
export const generateApiKey = (userId) => {
    const apiKey = crypto.randomBytes(32).toString('hex');
    API_KEYS.set(apiKey, {
        userId,
        createdAt: new Date(),
        rateLimit: 1000
    });
    return apiKey;
};
export const revokeApiKey = (apiKey) => {
    return API_KEYS.delete(apiKey);
};
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err)
                return res.status(403).json({ error: 'Invalid token' });
            req.user = user;
            next();
        });
    }
    else {
        res.status(401).json({ error: 'Authentication token required' });
    }
};
export const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
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
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const apiKey = req.headers['x-api-key'];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    else if (apiKey) {
        const keyData = API_KEYS.get(apiKey);
        if (keyData) {
            req.apiKey = apiKey;
            req.user = { userId: keyData.userId };
        }
    }
    next();
};
export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
//# sourceMappingURL=auth.js.map