import mongoose from 'mongoose';

export interface IPlace extends mongoose.Document {
  lat: number;
  lon: number;
  class: string;
  type: string;
  name: string;
  addresstype: string;
  display_name: string;
  amenity: string;
  house_number: string;
  road: string;
  suburb: string;
  city: string;
  county: string;
  state: string;
  postcode: string;
  country: string;
  country_code: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: Date;
  updatedAt: Date;
}

const placeSchema = new mongoose.Schema(
  {
    lat: Number,
    lon: Number,
    class: String,
    type: String,
    name: String,
    addresstype: String,
    display_name: String,
    amenity: String,
    house_number: String,
    road: String,
    suburb: String,
    city: String,
    county: String,
    state: String,
    postcode: String,
    country: String,
    country_code: String,

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], 
        required: true,
      },
    },
  },
  { timestamps: true }
);

placeSchema.index({ location: '2dsphere' });

placeSchema.index({
  display_name: 'text',
  road: 'text',
  suburb: 'text',
  city: 'text',
  state: 'text',
  country: 'text',
});

const Place = mongoose.model<IPlace>('Place', placeSchema);
export default Place;
