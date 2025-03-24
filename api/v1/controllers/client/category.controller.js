const Category = require("../../models/category.model");

// [POST]/api/v1/categories
module.exports.index = async (req, res) => {
    const categories = await Category.find({
        status: 'active',
        deleted: false
    });
    res.json(categories);
};