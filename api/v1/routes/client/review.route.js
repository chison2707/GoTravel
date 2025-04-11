const express = require('express');
const router = express.Router();

const controller = require("../../controllers/client/review.controller");
const authMiddleware = require("../../middlewares/client/auth.middleware");

router.post('/:hotelId/:roomId', authMiddleware.requireAuth, controller.review);
router.get('/get/:hotelId/:roomId', controller.getReviews);

module.exports = router;