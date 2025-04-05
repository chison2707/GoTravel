const Tour = require("../../models/tour.model");
const Hotel = require("../../models/hotel.model");

// [GET]/api/v1/
module.exports.index = async (req, res) => {
    // top tours
    const topSallers = await Tour.find({
        status: "active",
        deleted: false
    }).sort({ sold: "desc" }).limit(5);

    // new tours
    const newTours = await Tour.find({
        status: "active",
        deleted: false
    }).sort({ createdAt: -1 }).limit(5);

    // top hotels
    const topHotelSallers = await Hotel.find({
        status: "active",
        deleted: false
    }).sort({ sold: "desc" }).limit(5);

    res.json({
        topSallers: topSallers,
        newTours: newTours,
        topHotelSallers: topHotelSallers
    });
};