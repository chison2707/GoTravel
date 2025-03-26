const Cart = require("../../models/cart.model");
const Tour = require("../../models/tour.model");
const Order = require("../../models/order.model");
const Voucher = require("../../models/voucher.model");
const tourHelper = require("../../../../helper/tours");

//[GET] api/v1/checkout
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

//[POST] api/v1/checkout/order
module.exports.order = async (req, res) => {
    const cartId = req.cart.id;
    const { fullName, phone, note, voucherCode } = req.body;

    const user_id = req.user.id;

    const cart = await Cart.findOne({
        _id: cartId
    });
    if (!cart || cart.tours.length === 0) {
        return res.json({
            error: "400",
            message: "Giỏ hàng trống!"
        });
    }
    let totalPrice = 0;
    let discountAmount = 0;
    let tours = [];

    for (const tour of cart.tours) {
        const tourInfo = await Tour.findOne({
            _id: tour.tour_id
        });

        if (!tourInfo) {
            return res.json({
                error: "400",
                message: "Tour không tồn tại!"
            });
        }
        const priceNew = tourHelper.priceNewTour(tourInfo);
        const itemTotal = tour.quantity * priceNew;

        tours.push({
            tour_id: tour.tour_id,
            price: tourInfo.price,
            discount: tourInfo.discount,
            quantity: tour.quantity
        });
        totalPrice += itemTotal;

        await Tour.updateOne(
            { _id: tour.tour_id },
            {
                $inc: {
                    sold: tour.quantity,
                    stock: -tour.quantity
                }
            });
    }
    // Xử lý voucher nếu có
    if (voucherCode) {
        const voucher = await Voucher.findOne({
            code: voucherCode,
            deleted: false
        });

        if (voucher) {
            if (new Date() > new Date(voucher.endDate)) {
                return res.json({
                    error: "400",
                    message: "Voucher đã hết hạn!"
                });
            }

            if (voucher.quantity <= 0) {
                return res.json({
                    error: "400",
                    message: "Voucher đã hết số lượng!"
                });
            }

            const discountData = tourHelper.calculateDiscount(totalPrice, voucher);
            discountAmount = discountData.discountAmount;
            totalPrice = discountData.finalPrice;


            await Voucher.updateOne({
                _id: voucher._id
            }, {
                $inc:
                {
                    quantity: -1
                }
            });
        }
    }

    const newOrder = new Order({
        user_id: user_id,
        userInfor: { fullName, phone, note },
        status: "pending",
        tours,
        totalPrice,
        updateBy: []
    });

    const savedOrder = await newOrder.save();

    await Cart.updateOne({
        _id: cart._id
    }, {
        tours: []
    });

    res.json({
        status: "200",
        message: "Đặt hàng thành công!",
        order: savedOrder
    });
}

//[POST] api/v1/checkout/payment/:orderId
module.exports.createPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        if (!orderId) {
            return res.json({
                error: "400",
                message: "Thiếu orderId!"
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.json({
                error: "400",
                message: "Không tìm thấy đơn hàng!"
            });
        }

        const paymentUrl = vnpay.buildPaymentUrl({
            amount: order.totalPrice * 100,
            returnUrl: "http://localhost:3000/checkout/success",
            orderId: order._id.toString(),
            transactionId: `txn_${Date.now()}`,
            orderInfo: "Thanh toán đơn hàng du lịch",
            ipAddress: req.ip,
            bankCode: "VNPAYQR",
        });

        res.json({ paymentUrl });
    } catch (error) {
        console.error("Lỗi tạo thanh toán VNPay:", error);
        res.json({
            Error: "500",
            message: "Lỗi hệ thống!"
        });
    }
};

// [GET] api/v1/checkout/success
module.exports.paymentCallback = async (req, res) => {
    try {
        const query = req.query;
        const isValid = vnpay.verifyReturnUrl(query);

        if (!isValid) {
            return res.json({
                error: "400",
                message: "Xác thực thanh toán thất bại!"
            });
        }

        const orderId = query.vnp_TxnRef;
        const paymentStatus = query.vnp_ResponseCode === "00";

        if (paymentStatus) {
            await Order.findByIdAndUpdate(orderId, { status: "paid" });
            res.redirect(`http://localhost:3000/order-success`);
        } else {
            res.redirect(`http://localhost:3000/order-failed`);
        }
    } catch (error) {
        console.error("Lỗi xử lý callback:", error);
        res.json({
            error: "500",
            message: "Lỗi hệ thống!"
        });
    }
};