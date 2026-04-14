import mongoose from 'mongoose';
const placeSchema = new mongoose.Schema({
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
    // ✅ Add this GeoJSON field
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
}, { timestamps: true });
// ✅ Create 2dsphere index for geospatial queries
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
//# sourceMappingURL=place.model.js.map