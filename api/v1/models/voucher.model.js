const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema({
    title: String,
    code: String,
    description: String,
    quantity: Number,
    discount: Number,
    startDate: Date,
    endDate: Date,
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date
}, { timestamps: true });
const Voucher = mongoose.model('Voucher', VoucherSchema, "vouchers");
module.exports = Voucher;