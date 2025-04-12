const express = require('express');
const router = express.Router();

const controller = require("../../controllers/admin/review.controller");

router.get("/hotels/:hotelId", controller.indexHotel);

module.exports = router;