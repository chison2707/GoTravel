const express = require('express');
const router = express.Router();

const controller = require("../../controllers/client/chat.controller");
const authMiddleware = require("../../middlewares/client/auth.middleware");

router.post('/', authMiddleware.requireAuth, controller.getChatResponse);

module.exports = router;