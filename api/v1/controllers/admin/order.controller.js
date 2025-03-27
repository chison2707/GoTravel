const Order = require("../../models/order.model");
const paginationHelper = require("../../../../helper/pagination");
const Tour = require("../../models/tour.model");
const tourHelper = require("../../../../helper/tours");

// [GET]/api/v1/admin/orders
module.exports.index = async (req, res) => {
    let find = { deleted: false };

    if (req.query.status) {
        find.status = req.query.status;
    };

    // sort
    const sort = {};
    if (req.query.sortKey && req.query.sortValue) {
        sort[req.query.sortKey] = req.query.sortValue;
    }

    // pagination
    const countRecords = await Order.countDocuments(find);
    let objPagination = paginationHelper(
        {
            currentPage: 1,
            limitItems: 5
        },
        req.query,
        countRecords
    );
    // end pagination

    const orders = await Order.find().sort(sort).limit(objPagination.limitItems).skip(objPagination.skip);

    res.json(orders);
};

// [PATCH]/api/v1/admin/orders/changeStatus/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Order.updateOne({
            _id: id
        }, {
            status: status
        });

        res.json({
            code: 200,
            message: "Cập nhật trạng thái thành công!"
        });
    } catch (error) {
        res.json({
            code: 500,
            message: "Có lỗi " + error
        });
    }
};

// [GET]/api/v1/admin/orders/detail/:id
module.exports.detail = async (req, res) => {
    const id = req.params.id;
    const order = await Order.findOne({
        _id: id
    });
    const tours = [];
    for (const item of order.tours) {
        const tourInfo = await Tour.findOne({
            _id: item.tour_id
        });
        tours.push({
            tourInfo: tourInfo,
            quantity: item.quantity,
            priceNew: tourHelper.priceNewTour(tourInfo)
        });
    }
    res.json(tours);
};