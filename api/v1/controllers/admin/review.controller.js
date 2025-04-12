const paginationHelper = require("../../helper/pagination");
const Review = require("../../models/hotelReview.model");

// [GET]/api/v1/admin/reviews/hotels/:hotelId
module.exports.indexHotel = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("review_view")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền xem danh sách review"
        });
    } else {
        const hotelId = req.params.hotelId;
        let find = {
            hotel_id: hotelId,
            deleted: false
        };

        // sort
        const sort = {};
        if (req.query.sortKey && req.query.sortValue) {
            sort[req.query.sortKey] = req.query.sortValue;
        }

        // pagination
        const countRecords = await Review.countDocuments(find);
        let objPagination = paginationHelper(
            {
                currentPage: 1,
                limitItems: 5
            },
            req.query,
            countRecords
        );
        // end pagination

        const reviews = await Review.find().sort(sort).limit(objPagination.limitItems).skip(objPagination.skip);

        res.json(reviews);
    }
};