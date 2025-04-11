const homeRoute = require("./home.route");
const userRoute = require("./user.route");
const categoryRoute = require("./category.route");
const tourRoute = require("./tour.route");
const cartRoute = require("./cart.route");
const checkoutRoute = require("./checkout.route");
const chatRoute = require("./chat.route");
const hotelRoute = require("./hotel.route");
const searchRoute = require("./search.route");
const reviewRoute = require("./review.route");

module.exports = (app) => {

    const version = "/api/v1";

    app.use(version + '/', homeRoute);
    app.use(version + '/users', userRoute);
    app.use(version + '/categories', categoryRoute);
    app.use(version + '/tours', tourRoute);
    app.use(version + '/carts', cartRoute);
    app.use(version + '/checkout', checkoutRoute);
    app.use(version + '/chats', chatRoute);
    app.use(version + '/hotels', hotelRoute);
    app.use(version + '/search', searchRoute);
    app.use(version + '/reviews', reviewRoute);
}