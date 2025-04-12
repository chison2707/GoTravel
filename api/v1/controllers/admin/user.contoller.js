const User = require("../../models/user.model");
const paginationHelper = require("../../helper/pagination");

// [GET]/api/v1/admin/user
module.exports.index = async (req, res) => {
    const permissions = req.roles.permissions;
    if (!permissions.includes("user_view")) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền xem danh sách user"
        });
    } else {
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
        const countRecords = await User.countDocuments(find);
        let objPagination = paginationHelper(
            {
                currentPage: 1,
                limitItems: 5
            },
            req.query,
            countRecords
        );
        // end pagination

        const accounts = await User.find(find).sort(sort).limit(objPagination.limitItems).skip(objPagination.skip).select("-password");

        res.json(accounts);
    }
};