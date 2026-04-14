import type { Request, Response } from 'express';
import Place from '../models/place.model.js';

const formatPlaceData = (item: any) => {
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);

  if (isNaN(lat) || isNaN(lon)) return null;

  return {
    ...item,
    lat,
    lon,
    location: {
      type: 'Point',
      coordinates: [lon, lat],
    },
  };
};

const createPlace = async (req: Request, res: Response): Promise<void> => {
  try {
    const formatted = formatPlaceData(req.body);
    if (!formatted) {
      res.status(400).json({ message: "Invalid coordinates" });
      return;
    }
    const place = new Place(formatted);
    await place.save();
    res.status(201).json(place);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

const bulkCreatePlaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    
    const cleanData = [];
    for (const item of items) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (!isNaN(lat) && !isNaN(lon)) {
        cleanData.push({
          ...item,
          lat,
          lon,
          location: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    if (cleanData.length === 0) {
      res.status(400).json({ message: "No valid records found" });
      return;
    }

    const result = await Place.collection.insertMany(cleanData, { ordered: false });

    res.status(201).json({
      success: true,
      insertedCount: result.insertedCount,
      message: `Successfully imported ${result.insertedCount} places`
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: error.message,
      partialInsertedCount: error.result?.insertedCount || 0
    });
  }
};

const autocompletePlaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }

    const results = await Place.find({
      display_name: { $regex: `^${query}| ${query}`, $options: 'i' }
    })
    .select('display_name name lat lon')
    .limit(10)
    .lean();

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getBoundingBox = (lat: number, lon: number, radiusKm: number) => {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
};

const getPlaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const places = await Place.find().limit(100);
    res.json(places);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getPlaceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) {
      res.status(404).json({ message: 'Place not found' });
      return;
    }
    res.json(place);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const searchPlaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string;
    if (!q) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    let results = await Place.find({ $text: { $search: q } }).limit(10);

    if (results.length === 0) {
      results = await Place.find({
        $or: [
          { display_name: { $regex: q, $options: 'i' } },
          { road: { $regex: q, $options: 'i' } },
          { city: { $regex: q, $options: 'i' } },
        ],
      }).limit(10);
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const getNearbyPlaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const radiusInKm = parseFloat(req.query.radius as string) || 5;

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ message: 'Valid coordinates required' });
      return;
    }

    const radiusInMeters = radiusInKm * 1000;

    let places = await Place.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          $maxDistance: radiusInMeters,
        },
      },
    });

    if (places.length === 0) {
      const bbox = getBoundingBox(lat, lon, radiusInKm);
      places = await Place.find({
        lat: { $gte: bbox.minLat, $lte: bbox.maxLat },
        lon: { $gte: bbox.minLon, $lte: bbox.maxLon },
      }).limit(50);
    }

    res.json({
      count: places.length,
      radius: `${radiusInKm} km`,
      places,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export {
  createPlace,
  bulkCreatePlaces,
  getPlaces,
  getPlaceById,
  searchPlaces,
  getNearbyPlaces,
  autocompletePlaces
};