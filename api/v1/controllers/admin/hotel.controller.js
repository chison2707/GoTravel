const Hotel = require("../../models/hotel.model");

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