const express = require('express');
const router = express.Router();

const controller = require("../../controllers/client/checkout.controller");
const authMiddleware = require("../../middlewares/client/auth.middleware");

router.get('/', authMiddleware.requireAuth, controller.index);
router.post('/order', authMiddleware.requireAuth, controller.order);
router.post("/payment/:orderId", authMiddleware.requireAuth, controller.createPayment);
// router.get('/success/:orderId', authMiddleware.requireAuth, controller.paymentCallback);

module.exports = router;