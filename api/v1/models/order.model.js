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
    totalPrice: Number,
    updateBy: [
        {
            account_id: String,
            updatedAt: Date
        }
    ],
    paymentInfo: Object, // Lưu toàn bộ dữ liệu VNPay
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },
    transactionNo: String, // Mã giao dịch VNPay
    paymentMethod: String, // ATM, Credit Card, QR Code
    paidAt: Date // Thời gian thanh toán thành công
}, {
    timestamps: true
});
const Order = mongoose.model("Order", orderSchema, "orders");

module.exports = Order;