import express from 'express';
import {
  createPlace,
  bulkCreatePlaces,
  getPlaces,
  getNearbyPlaces,
  searchPlaces,
  autocompletePlaces,
  getPlaceById
} from '../controllers/place.controller.js';
import { cacheResponse } from '../middleware/cache.js';
import { authenticateRequest } from '../middleware/auth.js';

const router = express.Router();

// Cache only public read endpoints. Writes remain uncached.
router.get('/', cacheResponse(600), getPlaces);
router.get('/search', cacheResponse(300), searchPlaces);
router.get('/autocomplete', cacheResponse(300), autocompletePlaces);
router.get('/nearby', cacheResponse(180), getNearbyPlaces);
router.get('/:id', cacheResponse(900), getPlaceById);

router.post('/', authenticateRequest, createPlace);
router.post('/bulk', authenticateRequest, bulkCreatePlaces);

export default router;
