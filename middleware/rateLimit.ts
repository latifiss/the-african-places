import rateLimit from 'express-rate-limit';

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: import('express').Request, res: import('express').Response) => {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
  },
};

export const generalRateLimit = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

export const authRateLimit = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});
