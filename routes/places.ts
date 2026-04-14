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

const router = express.Router();

router.get('/', getPlaces);
router.get('/search', searchPlaces);
router.get('/autocomplete', autocompletePlaces);
router.get('/nearby', getNearbyPlaces);
router.get('/:id', getPlaceById); 

router.post('/', createPlace);
router.post('/bulk', bulkCreatePlaces);

export default router;