const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user_id: String,
    tours: [
        {
            tour_id: String,
            quantity: Number
        }
    ],
    hotels: [
        {
            hotel_id: String,
            rooms: [
                {
                    room_id: String,
                    quantity: Number
                }
            ],
        }
    ],
}, {
    timestamps: true
});
const Cart = mongoose.model("Cart", cartSchema, "carts");

module.exports = Cart;