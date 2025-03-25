const Cart = require("../../models/cart.model");
const Tour = require("../../models/tour.model");
const Order = require("../../models/order.model");
const Voucher = require("../../models/voucher.model");
const tourHelper = require("../../../../helper/tours");

//[GET] /checkout
module.exports.index = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ user_id: userId }).lean();
        if (!cart || !cart.tours.length) {
            return res.json({ _id: null, user_id: userId, tours: [], totalPrice: 0 });
        }

        // Lấy danh sách tất cả tour trong giỏ hàng
        const tourIds = cart.tours.map(item => item.tour_id);
        const tours = await Tour.find({ _id: { $in: tourIds } }).lean();

        let totalPrice = 0;
        const processedTours = cart.tours.map(item => {
            const tourInfo = tours.find(tour => tour._id.toString() === item.tour_id.toString());
            if (!tourInfo) return null;

            const priceNew = tourHelper.priceNewTour(tourInfo);
            const total = item.quantity * priceNew;
            totalPrice += total;

            return {
                tour_id: item.tour_id,
                quantity: item.quantity,
                tourInfo,
                priceNew,
                totalPrice: total
            };
        }).filter(item => item !== null);

        res.json({
            _id: cart._id,
            tours: processedTours,
            totalPrice
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};

//[POST] /checkout/order
module.exports.order = async (req, res) => {
    const cartId = req.cart.id;
    const userInfo = req.body;
    const user_id = req.user.id;

    const cart = await Cart.findOne({
        _id: cartId
    });

    let tours = [];

    for (const tour of cart.tours) {
        const objTour = {
            tour_id: tour.tour_id,
            price: 0,
            discount: 0,
            quantity: tour.quantity
        };

        const tourInfo = await Tour.findOne({
            _id: tour.tour_id
        });

        objTour.price = tourInfo.price;
        objTour.discount = tourInfo.discount;
        await Tour.updateOne(
            { _id: tour.tour_id },
            {
                $inc: {
                    sold: tour.quantity,
                    stock: -tour.quantity
                }
            });
        tours.push(objTour);
    }

    const objOrder = {
        user_id: user_id,
        userInfor: userInfo,
        tours: tours
    };

    const order = new Order(objOrder);
    const data = await order.save();

    await Cart.updateOne({
        _id: cartId
    }, {
        tours: []
    });

    res.json({
        code: 200,
        message: "Đặt hàng thành công",
        data: data
    });
}

// [GET] /checkout/success/:id
// module.exports.success = async (req, res) => {
//     const order = await Order.findOne({
//         _id: req.params.orderId
//     });

//     for (const tour of order.tours) {
//         const tourInfo = await Tour.findOne({
//             _id: tour.tour_id
//         }).select("title images[0]");

//         tour.tourInfo = tourInfo;

//         tour.priceNew = tourHelper.priceNewTour(tour);

//         tour.totalPrice = tour.priceNew * tour.quantity;

//     }
//     order.totalPrice = order.tours.reduce((sum, item) => sum + item.totalPrice, 0);

//     res.json(order);
// }