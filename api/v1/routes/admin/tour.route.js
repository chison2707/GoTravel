const express = require('express');
const router = express.Router();

const controller = require("../../controllers/admin/tour.controller");
const validate = require("../../validates/admin/tour.validate");

router.get("/", controller.index);
router.post('/create', validate.tourValidate, controller.createPost);
router.patch("/change-status/:status/:id", controller.changeStatus);
router.delete("/delete/:id", controller.deleteTour);
router.patch("/edit/:id", controller.editPatch);
router.get("/detail/:id", controller.detail);

module.exports = router;