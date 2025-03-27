const Order = require("../../models/order.model");
const paginationHelper = require("../../../../helper/pagination");

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