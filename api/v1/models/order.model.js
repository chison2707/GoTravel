const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user_id: String,
    orderCode: String,
    userInfor: {
        fullName: String,
        phone: String,
        note: String
    },
    status: {
        type: String,
        default: "pending"
    },
    tours: [
        {
            tour_id: String,
            price: Number,
            discount: Number,
            quantity: Number
        }
    ],
    hotels: [
        {
            hotel_id: String,
            rooms: [
                {
                    room_id: String,
                    price: Number,
                    quantity: Number
                }
            ],

        }
    ],
    totalPrice: Number,
    updateBy: [
        {
            account_id: String,
            updatedAt: Date
        }
    ],
    paymentInfo: Object,
}, {
    timestamps: true
});
const Order = mongoose.model("Order", orderSchema, "orders");

module.exports = Order;