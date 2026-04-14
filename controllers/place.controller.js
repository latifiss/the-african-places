import Place from '../models/place.model.js';
const createPlace = async (req, res) => {
    try {
        const place = new Place(req.body);
        await place.save();
        res.status(201).json(place);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const getPlaces = async (req, res) => {
    try {
        const places = await Place.find();
        res.json(places);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
        const places = await Place.find({
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
        res.json({
            count: places.length,
            radius: `${radiusInKm} km`,
            places,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export { createPlace, getPlaces, getPlaceById, searchPlaces, getNearbyPlaces };
//# sourceMappingURL=place.controller.js.map