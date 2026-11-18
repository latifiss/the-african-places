import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import Place from '../models/place.model.js';
import { invalidatePlaceCache } from '../middleware/cache.js';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validSearchTerm = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 100;

const formatPlaceData = (item: any) => {
  if (!item || typeof item !== 'object') return null;
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { ...item, lat, lon, location: { type: 'Point', coordinates: [lon, lat] } };
};

const createPlace = async (req: Request, res: Response): Promise<void> => {
  const formatted = formatPlaceData(req.body);
  if (!formatted) { res.status(400).json({ message: 'Invalid place coordinates' }); return; }
  const place = new Place(formatted);
  await place.save();
  await invalidatePlaceCache();
  res.status(201).json(place);
};

const bulkCreatePlaces = async (req: Request, res: Response): Promise<void> => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  if (items.length > 5000) { res.status(413).json({ message: 'A maximum of 5000 places can be imported per request' }); return; }
  const cleanData = items.map(formatPlaceData).filter((item): item is NonNullable<typeof item> => item !== null)
    .map((item) => ({ ...item, createdAt: new Date(), updatedAt: new Date() }));
  if (!cleanData.length) { res.status(400).json({ message: 'No valid records found' }); return; }

  try {
    const result = await Place.collection.insertMany(cleanData, { ordered: false });
    void invalidatePlaceCache();
    res.status(201).json({ success: true, insertedCount: result.insertedCount, message: `Successfully imported ${result.insertedCount} places` });
  } catch (error) {
    const partial = error as { result?: { insertedCount?: number } };
    res.status(500).json({ message: 'Bulk import failed; some valid records may have been inserted', partialInsertedCount: partial.result?.insertedCount || 0 });
  }
};

const autocompletePlaces = async (req: Request, res: Response): Promise<void> => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 2 || query.length > 100) { res.json([]); return; }
  const results = await Place.find({
    display_name: { $regex: `^${escapeRegex(query)}| ${escapeRegex(query)}`, $options: 'i' },
  }).select('display_name name lat lon').limit(10).maxTimeMS(3000).lean();
  res.json(results);
};

const getBoundingBox = (lat: number, lon: number, radiusKm: number) => {
  const latDelta = radiusKm / 111.32;
  const cosine = Math.max(Math.abs(Math.cos((lat * Math.PI) / 180)), 0.01);
  const lonDelta = radiusKm / (111.32 * cosine);
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLon: lon - lonDelta, maxLon: lon + lonDelta };
};

const getPlaces = async (_req: Request, res: Response): Promise<void> => {
  const places = await Place.find().limit(100).maxTimeMS(5000).lean();
  res.json(places);
};

const getPlaceById = async (req: Request, res: Response): Promise<void> => {
  if (!isValidObjectId(req.params.id)) { res.status(400).json({ message: 'Invalid place ID' }); return; }
  const place = await Place.findById(req.params.id).maxTimeMS(3000).lean();
  if (!place) { res.status(404).json({ message: 'Place not found' }); return; }
  res.json(place);
};

const searchPlaces = async (req: Request, res: Response): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!validSearchTerm(q)) { res.status(400).json({ message: 'Search query must be between 1 and 100 characters' }); return; }

  let results = await Place.find({ $text: { $search: q } }).limit(10).maxTimeMS(5000).lean();
  if (results.length === 0) {
    const safeQuery = escapeRegex(q);
    results = await Place.find({
      $or: [
        { display_name: { $regex: safeQuery, $options: 'i' } },
        { road: { $regex: safeQuery, $options: 'i' } },
        { city: { $regex: safeQuery, $options: 'i' } },
      ],
    }).limit(10).maxTimeMS(3000).lean();
  }
  res.json(results);
};

const getNearbyPlaces = async (req: Request, res: Response): Promise<void> => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radiusInKm = req.query.radius === undefined ? 5 : Number(req.query.radius);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 ||
      !Number.isFinite(radiusInKm) || radiusInKm <= 0 || radiusInKm > 100) {
    res.status(400).json({ message: 'Valid coordinates and a radius between 0 and 100 km are required' });
    return;
  }

  const radiusInMeters = radiusInKm * 1000;
  let places = await Place.find({
    location: { $near: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: radiusInMeters } },
  }).limit(100).maxTimeMS(5000).lean();

  if (places.length === 0) {
    const bbox = getBoundingBox(lat, lon, radiusInKm);
    places = await Place.find({
      lat: { $gte: bbox.minLat, $lte: bbox.maxLat },
      lon: { $gte: bbox.minLon, $lte: bbox.maxLon },
    }).limit(50).maxTimeMS(5000).lean();
  }
  res.json({ count: places.length, radius: `${radiusInKm} km`, places });
};

export { createPlace, bulkCreatePlaces, getPlaces, getPlaceById, searchPlaces, getNearbyPlaces, autocompletePlaces };
