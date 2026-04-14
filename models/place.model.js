import mongoose from 'mongoose';
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
  },
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
const Place = mongoose.model('Place', placeSchema);
export default Place;
