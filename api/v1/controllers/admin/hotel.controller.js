const Hotel = require("../../models/hotel.model");
const Room = require("../../models/room.model");

// [POST]/api/v1/admin/hotels
module.exports.index = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("hotel_view")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền xem danh sách khách sạn"
        });
    } else {
        try {
            const hotels = await Hotel.find({ deleted: false });
            res.json({
                code: 200,
                message: "Danh sách khách sạn",
                data: hotels
            });
        } catch (error) {
            res.json({
                code: 500,
                message: "Error: " + error
            });
        }
    }
}

// [POST]/api/v1/admin/hotels/create
module.exports.createPost = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("hotel_create")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền tạo khách sạn"
        });
    } else {
        try {
            const hotel = new Hotel(req.body);
            const data = await hotel.save();
            res.json({
                code: 200,
                message: "Tạo thành công",
                data: data
            });
        } catch (error) {
            res.json({
                code: 500,
                message: "Error:" + error
            });
        }
    }
};

// [POST]/api/v1/admin/hotels/create/:hotelId
module.exports.createPostRoom = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("hotel_edit")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền tạo phòng khách sạn"
        });
    } else {
        try {
            const hotelId = req.params.hotelId;
            const room = new Room({
                hotel_id: hotelId,
                name: req.body.name,
                price: req.body.price,
                amenities: req.body.amenities,
                availableRooms: parseInt(req.body.availableRooms),
                images: req.body.images
            });
            const data = await room.save();
            res.json({
                code: 200,
                message: "Tạo thành công",
                data: data
            });
        } catch (error) {
            res.json({
                code: 500,
                message: "Error:" + error
            });
        }
    }
};