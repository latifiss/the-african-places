import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const generateNewApiKey: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map