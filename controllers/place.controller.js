import Place from '../models/place.model.js';
const formatPlaceData = (item) => {
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
const createPlace = async (req, res) => {
  try {
    const formatted = formatPlaceData(req.body);
    if (!formatted) {
      res.status(400).json({ message: 'Invalid coordinates' });
      return;
    }
    const place = new Place(formatted);
    await place.save();
    res.status(201).json(place);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
const bulkCreatePlaces = async (req, res) => {
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
            coordinates: [lon, lat],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    if (cleanData.length === 0) {
      res.status(400).json({ message: 'No valid records found' });
      return;
    }
    const result = await Place.collection.insertMany(cleanData, {
      ordered: false,
    });
    res.status(201).json({
      success: true,
      insertedCount: result.insertedCount,
      message: `Successfully imported ${result.insertedCount} places`,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      partialInsertedCount: error.result?.insertedCount || 0,
    });
  }
};
const autocompletePlaces = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) {
      res.json([]);
      return;
    }
    const results = await Place.find({
      display_name: { $regex: `^${query}| ${query}`, $options: 'i' },
    })
      .select('display_name name lat lon')
      .limit(10)
      .lean();
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getBoundingBox = (lat, lon, radiusKm) => {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
};
const getPlaces = async (req, res) => {
  try {
    const places = await Place.find();
    res.json(places);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getPlaceById = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) {
      res.status(404).json({ message: 'Place not found' });
      return;
    }
    res.json(place);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const searchPlaces = async (req, res) => {
  try {
    const q = req.query.q;
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
          { suburb: { $regex: q, $options: 'i' } },
          { state: { $regex: q, $options: 'i' } },
          { country: { $regex: q, $options: 'i' } },
        ],
      }).limit(10);
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lon, radius = '5' } = req.query;
    if (!lat || !lon) {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }
    const radiusInKm = parseFloat(radius);
    const radiusInMeters = radiusInKm * 1000;
    let places = await Place.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)],
          },
          $maxDistance: radiusInMeters,
        },
      },
    });

    if (places.length === 0) {
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      const bbox = getBoundingBox(latNum, lonNum, radiusInKm);
      places = await Place.find({
        lat: { $gte: bbox.minLat, $lte: bbox.maxLat },
        lon: { $gte: bbox.minLon, $lte: bbox.maxLon },
      }).limit(100);
    }

    res.json({
      count: places.length,
      radius: `${radiusInKm} km`,
      places,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export {
  createPlace,
  bulkCreatePlaces,
  autocompletePlaces,
  getPlaces,
  getPlaceById,
  searchPlaces,
  getNearbyPlaces,
};
