import type { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: any;
    apiKey?: string;
}
export interface UserPayload {
    userId: string;
    email: string;
}
export declare const generateApiKey: (userId: string) => string;
export declare const revokeApiKey: (apiKey: string) => boolean;
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const authenticateApiKey: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const generateToken: (payload: UserPayload) => string;
//# sourceMappingURL=auth.d.ts.map