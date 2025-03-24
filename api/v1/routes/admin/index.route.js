const systemConfig = require("../../../../config/system");

const categoryRoutes = require("./category.route");
const tourRoutes = require("./tour.route");
const roleRoutes = require("./role.route");
const accountRoutes = require("./account.route");

const authMiddleware = require("../../middlewares/admin/auth.middleware");

module.exports = (app) => {
    const version = "/api/v1";
    const PARTH_ADMIN = systemConfig.prefixAdmin;

    app.use(version + PARTH_ADMIN + "/categories", authMiddleware.requireAuth, categoryRoutes);
    app.use(version + PARTH_ADMIN + "/tours", authMiddleware.requireAuth, tourRoutes);
    app.use(version + PARTH_ADMIN + "/roles", authMiddleware.requireAuth, roleRoutes);
    app.use(version + PARTH_ADMIN + "/accounts", accountRoutes);
}