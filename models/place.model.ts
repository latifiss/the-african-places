import mongoose, { Schema, Document } from 'mongoose';

export interface IPlace extends Document {
  lat: number;
  lon: number;
  class?: string;
  type?: string;
  name?: string;
  addresstype?: string;
  display_name?: string;
  amenity?: string;
  house_number?: string;
  road?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: Date;
  updatedAt: Date;
}

const placeSchema = new Schema<IPlace>(
  {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
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
  { 
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id?.toString ? ret._id.toString() : ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id?.toString ? ret._id.toString() : ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

placeSchema.index({ location: '2dsphere' });

placeSchema.index({
  display_name: 'text',
  road: 'text',
  suburb: 'text',
  city: 'text',
  state: 'text',
  country: 'text',
}, {
  weights: {
    display_name: 10,
    city: 5,
    road: 3
  },
  name: "PlaceTextIndex"
});

placeSchema.index({ lat: 1, lon: 1 });
placeSchema.index({ name: 1 });

const Place = mongoose.model<IPlace>('Place', placeSchema, 'places');

export default Place;