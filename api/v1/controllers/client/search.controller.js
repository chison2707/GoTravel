const Tour = require("../../models/tour.model");
const { convertToSlug } = require("../../helper/convertToSlug");

// [GET]/api/v1/search/tours?keyword=...&mode=...
module.exports.result = async (req, res) => {
    try {
        const keyWord = `${req.query.keyword}`;
        const mode = `${req.query.mode || "full"}`;
        if (keyWord) {
            const keywordRegex = new RegExp(keyWord, "i");

            const stringSlug = convertToSlug(keyWord);
            const stringSlugRegex = new RegExp(stringSlug, "i");

            const tours = await Tour.find({
                $or: [
                    { title: keywordRegex },
                    { slug: stringSlugRegex }
                ]
            });

            const newTours = tours.map(tour => ({
                _id: tour.id,
                title: tour.title,
                avatar: tour.images?.[0],
                sold: tour.sold,
                slug: tour.slug,
            }));

            res.status(200).json({
                code: 200,
                message: "Tìm kiếm thành công!",
                keyword: keyWord,
                mode: mode,
                tours: newTours
            });
        }
    } catch (error) {
        res.json({
            code: 500,
            message: "Lỗi! " + error
        });

    }
};
