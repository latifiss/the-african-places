// scripts/migrate-location-field.ts
import mongoose from 'mongoose';
import Place from '../models/place.model.js';

async function migrateLocationField() {
  try {
    await mongoose.connect('your-mongodb-uri');
    
    const result = await Place.updateMany(
      { 
        lat: { $exists: true, $ne: null },
        lon: { $exists: true, $ne: null },
        'location.coordinates': { $size: 0 } // Only update if empty
      },
      [
        {
          $set: {
            location: {
              type: 'Point',
              coordinates: ['$lon', '$lat'] // Note: GeoJSON uses [lng, lat] order
            }
          }
        }
      ]
    );
    
    console.log(`Updated ${result.modifiedCount} documents`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateLocationField();