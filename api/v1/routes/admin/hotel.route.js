const express = require('express');
const multer = require("multer");
const router = express.Router();

const controller = require("../../controllers/admin/hotel.controller");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");
const validate = require("../../validates/admin/hotel.validate");
const upload = multer();

// router.get("/", controller.index);
router.post('/create',
    upload.fields([{ name: 'images', maxCount: 10 }]),
    uploadCloud.uploadFields,
    validate.hotelValidate,
    controller.createPost
);
module.exports = router;