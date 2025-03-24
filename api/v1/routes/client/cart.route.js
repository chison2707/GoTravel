const express = require('express');
const router = express.Router();

const controller = require("../../controllers/client/cart.controller");
const authMiddleware = require("../../middlewares/client/auth.middleware");

router.get('/', authMiddleware.requireAuth, controller.index);
router.post('/add/:tour_id', authMiddleware.requireAuth, controller.addPost);
router.patch('/delete/:tour_id', authMiddleware.requireAuth, controller.delete);
router.patch('/update/:tour_id/:quantity', authMiddleware.requireAuth, controller.update);

module.exports = router;