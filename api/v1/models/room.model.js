const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    hotel_id: String,
    name: String,
    price: Number,
    amenities: String,
    availableRooms: {
        type: Number,
        default: 0
    },
    images: Array
});

const Room = mongoose.model('Room', RoomSchema, "rooms");
module.exports = Room;