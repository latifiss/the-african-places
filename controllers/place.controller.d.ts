import type { Request, Response } from 'express';
declare const createPlace: (req: Request, res: Response) => Promise<void>;
declare const getPlaces: (req: Request, res: Response) => Promise<void>;
declare const getPlaceById: (req: Request, res: Response) => Promise<void>;
declare const searchPlaces: (req: Request, res: Response) => Promise<void>;
declare const getNearbyPlaces: (req: Request, res: Response) => Promise<void>;
export { createPlace, getPlaces, getPlaceById, searchPlaces, getNearbyPlaces };
//# sourceMappingURL=place.controller.d.ts.map