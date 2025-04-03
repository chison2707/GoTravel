const Hotel = require("../../models/hotel.model");
const Room = require("../../models/room.model");

// [GET]/api/v1/admin/hotels
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

// [GET]/api/v1/admin/hotels/:hotelId
module.exports.indexRoom = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("hotel_view")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền xem danh sách room của khách sạn"
        });
    } else {
        try {
            const hotelId = req.params.hotelId;
            const room = await Room.find({
                hotel_id: hotelId
            });
            res.json({
                code: 200,
                message: "Danh sách room của khách sạn",
                data: room
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

// [PATCH]/api/v1/admin/hotels/edit/:hotelId
module.exports.editHotel = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("hotel_edit")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền chỉnh sửa khách sạn"
        });
    } else {
        try {
            const hotelId = req.params.hotelId;
            await Hotel.updateOne({
                _id: hotelId,
                deleted: false
            }, req.body);
            res.json({
                code: 200,
                message: "Cập nhật thành công"
            });
        } catch (error) {
            res.json({
                code: 500,
                message: "Error:" + error
            });
        }
    }
};