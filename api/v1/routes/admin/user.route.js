const express = require('express');
const router = express.Router();

const controller = require("../../controllers/admin/user.contoller");

router.get("/", controller.index);
router.get("/detail/:id", controller.detail);
// router.patch("/edit/:id", authMiddleware.requireAuth, controller.edit);
// router.patch("/changeStatus/:status/:id", authMiddleware.requireAuth, controller.changeStatus);
// router.delete("/delete/:id", authMiddleware.requireAuth, controller.delete);

module.exports = router;