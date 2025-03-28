const SettingGeneral = require("../../models/settings-general.model");

//[PATCH] /api/v1/admin/settings/general
module.exports.generalPatch = async (req, res) => {
    try {
        const settingGeneral = await SettingGeneral.findOne({});

        if (settingGeneral) {
            await SettingGeneral.updateOne({
                _id: settingGeneral._id
            }, req.body)
        } else {
            const record = new SettingGeneral(req.body);
            await record.save();
        }
        res.josn({
            code: 200,
            message: "Cập nhật thành công!",
        });
    } catch (error) {
        res.josn({
            code: 500,
            message: "Lỗi" + error
        });
    }
}