const mongoose = require('mongoose');
const slug = require('mongoose-slug-updater');

mongoose.plugin(slug);
const HotelSchema = new mongoose.Schema({
    name: String,
    images: Array,
    price: Number,
    discount: Number,
    amenities: String,
    availableRooms: Number,
    location: {
        city: String,
        country: String,
        address: String
    },
    sold: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: "active"
    },
    slug: {
        type: String,
        slug: "title",
        unique: true
    },
    deleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });
const Hotel = mongoose.model('Hotel', HotelSchema, "hotels");
module.exports = Hotel;