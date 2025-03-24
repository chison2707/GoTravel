const express = require('express');
const router = express.Router();

const controller = require("../../controllers/admin/voucher.controller");
const validate = require("../../validates/admin/voucher.validate");

// router.get("/", controller.index);
router.post('/create', validate.voucherValidate, controller.createPost);

module.exports = router;