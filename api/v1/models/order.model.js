const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user_id: String,
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
    totalPrice: Number,
    updateBy: [
        {
            account_id: String,
            updatedAt: Date
        }
    ]
}, {
    timestamps: true
});
const Order = mongoose.model("Order", orderSchema, "orders");

module.exports = Order;