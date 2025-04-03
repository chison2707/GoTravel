module.exports.hotelValidate = (req, res, next) => {
    const errors = [];
    if (!req.body.name) {
        errors.push('Vui lòng nhập tên khách sạn!');
    }
    if (!req.body.location) {
        errors.push('Vui lòng nhập địa điểm!');
    }
    if (parseInt(req.body.price) <= 0) {
        errors.push('Vui lòng nhập giá lớn hơn 0!');
    }
    if (parseInt(req.body.discount) <= 0) {
        errors.push('Vui lòng nhập % giảm giá lớn hơn 0!');
    }
    if (parseInt(req.body.availableRooms) <= 0) {
        errors.push('Vui lòng nhập số lượng lớn hơn 0!');
    }
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors: errors
        });
    }
    next();
}