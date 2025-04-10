const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    hotel_id: String,
    user_id: String,
    rating: {
        type: Number,
        required: true,
        min: 1, max: 5
    },
    comment: String
}, {
    timestamps: true
});
const Review = mongoose.model("Review", reviewSchema, "reviews");

module.exports = Review;