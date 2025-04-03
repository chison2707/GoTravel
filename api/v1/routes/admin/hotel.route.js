const express = require('express');
const multer = require("multer");
const router = express.Router();

const controller = require("../../controllers/admin/hotel.controller");
const uploadCloud = require("../../middlewares/admin/uploadCloud.middleware");
const validate = require("../../validates/admin/hotel.validate");
const upload = multer();

router.get("/", controller.index);
router.get("/:hotelId", controller.indexRoom);
router.post('/create',
    upload.fields([{ name: 'images', maxCount: 10 }]),
    uploadCloud.uploadFields,
    validate.hotelValidate,
    controller.createPost
);
router.post('/create/:hotelId',
    upload.fields([{ name: 'images', maxCount: 10 }]),
    uploadCloud.uploadFields,
    validate.roomValidate,
    controller.createPostRoom
);
module.exports = router;