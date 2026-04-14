import express from 'express';
import {
  createPlace,
  bulkCreatePlaces,
  getPlaces,
  getNearbyPlaces,
  searchPlaces,
  autocompletePlaces,
  getPlaceById,
} from '../controllers/place.controller.js';
const router = express.Router();
/**
 * @route GET /api/places
 * @desc Get all places
 */
router.get('/', getPlaces);
/**
 * @route GET /api/places/search?q=<query>
 * @desc Search places by name, city, etc.
 */
router.get('/search', searchPlaces);
router.get('/autocomplete', autocompletePlaces);
router.get('/nearby', getNearbyPlaces);
/**
 * @route GET /api/places/:id
 * @desc Get a single place by ID
 */
router.get('/:id', getPlaceById); // THIS MUST BE LAST
/**
 * @route POST /api/places
 * @desc Create a new place
 */
router.post('/', createPlace);
router.post('/bulk', bulkCreatePlaces);
export default router;
//# sourceMappingURL=places.js.map
