import express from 'express';
import {
  createPlace,
  getPlaces,
  getPlaceById,
    searchPlaces,
  getNearbyPlaces
} from '../controllers/place.controller.js';

const router = express.Router();

/**
 * @route POST /api/places
 * @desc Create a new place
 */
router.post('/', createPlace);

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
router.get('/nearby', getNearbyPlaces);

/**
 * @route GET /api/places/:id
 * @desc Get a single place by ID
 */
router.get('/:id', getPlaceById);


export default router;
