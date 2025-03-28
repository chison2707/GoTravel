const express = require('express');
const router = express.Router();

const controller = require("../../controllers/admin/setting.controller");
const validate = require("../../validates/admin/setting.validate");

router.patch('/general', validate.settingValidate, controller.generalPatch);

module.exports = router;