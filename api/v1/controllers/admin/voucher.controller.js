const Voucher = require("../../models/voucher.model");

// [POST]/api/v1/admin/vouchers/create
module.exports.createPost = async (req, res) => {
    try {
        const startDate = req.body.startDate ? new Date(req.body.startDate) : Date.now();
        const endDate = new Date(req.body.endDate);

        // Tạo đối tượng voucher mới
        const voucher = new Voucher({
            title: req.body.title,
            code: req.body.code,
            description: req.body.description,
            quantity: req.body.quantity,
            discount: req.body.discount,
            startDate: startDate,
            endDate: endDate,
        });

        // Lưu voucher vào cơ sở dữ liệu
        const data = await voucher.save();

        res.json({
            code: 200,
            message: "Tạo voucher thành công",
            data: data
        });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: "Lỗi khi tạo voucher: " + error.message
        });
    }
};