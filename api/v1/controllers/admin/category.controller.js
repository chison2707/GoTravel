const Category = require("../../models/category.model");
const paginationHelper = require("../../../../helper/pagination");

// [GET]/api/v1/admin/categories
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
    const countRecords = await Category.countDocuments(find);
    let objPagination = paginationHelper(
        {
            currentPage: 1,
            limitItems: 5
        },
        req.query,
        countRecords
    );
    // end pagination

    const categories = await Category.find().sort(sort).limit(objPagination.limitItems).skip(objPagination.skip);

    res.json(categories);
};

// [POST]/api/v1/admin/categories/create
module.exports.create = async (req, res) => {
    try {
        const category = new Category({
            title: req.body.title,
            image: req.body.image,
            description: req.body.description,
            status: req.body.status,
        });
        const data = await category.save();
        res.json({
            code: 200,
            message: "Tạo thành công",
            data: data
        });
    } catch (error) {
        res.json({
            code: 404,
            message: "Không tồn tại!"
        });
    }
};

// [PATCH]/api/v1/admin/categories/changeStatus/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;
        await Category.updateOne({
            _id: id
        }, {
            status: status
        });
        res.json({
            code: 200,
            message: "Cập nhật trạng thái danh mục thành công",
        });
    } catch (error) {
        res.json({
            code: 404,
            message: "Không tồn tại!"
        });
    }
};

// [PATCH]/api/v1/admin/categories/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;
        await Category.updateOne({
            _id: id,
            deleted: false
        }, req.body);
        res.json({
            code: 200,
            message: "Cập nhật danh mục thành công",
        });
    } catch (error) {
        res.json({
            code: 404,
            message: "Không tồn tại!"
        });
    }
};

// [GET]/api/v1/admin/categories/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Category.findOne({
            _id: id,
            deleted: false
        });
        res.json({
            code: 200,
            message: "Thành công",
            data: data
        });
    } catch (error) {
        res.json({
            code: 404,
            message: "Không tồn tại!"
        });
    }
};

// [DELETE]/api/v1/admin/categories/delete/:id
module.exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        await Category.deleteOne({
            _id: id
        });
        res.json({
            code: 200,
            message: "Xóa thành công",
        });
    } catch (error) {
        res.json({
            code: 404,
            message: "Không tồn tại!"
        });
    }
};