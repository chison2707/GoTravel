const Voucher = require("../../models/voucher.model");

// [POST]/api/v1/admin/vouchers/create
module.exports.createPost = async (req, res) => {
    try {
        if (!req.body.startDate) {
            const voucher = new Voucher({
                title: req.body.title,
                code: req.body.code,
                description: req.body.description,
                quantity: req.body.quantity,
                discount: req.body.discount,
                startDate: Date.now(),
                endDate: req.body.endDate,
            });
        } else {
            const voucher = new Voucher({
                title: req.body.title,
                code: req.body.code,
                description: req.body.description,
                quantity: req.body.quantity,
                discount: req.body.discount,
                endDate: req.body.endDate,
            });
        }
        const data = await voucher.save();
        res.json({
            code: 200,
            message: "Tạo voucher thành công",
            data: data
        });
    } catch (error) {
        res.json({
            code: 404,
            message: "Không tồn tại!" + error
        });
    }
};