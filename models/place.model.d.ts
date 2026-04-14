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
declare const Place: mongoose.Model<IPlace, {}, {}, {}, mongoose.Document<unknown, {}, IPlace, {}, {}> & IPlace & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Place;
//# sourceMappingURL=place.model.d.ts.map