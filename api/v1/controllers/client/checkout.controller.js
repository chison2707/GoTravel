const Cart = require("../../models/cart.model");
const Tour = require("../../models/tour.model");
const Order = require("../../models/order.model");
const Voucher = require("../../models/voucher.model");
const tourHelper = require("../../helper/tours");
const generate = require("../../helper/generate");
const vnpay = require('../../../../config/vnpay');
const moment = require("moment");

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

    const countOrder = await Order.countDocuments();
    const code = generate.generateOrderCode(countOrder + 1);
    const newOrder = new Order({
        orderCode: code,
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

        const now = moment();
        const expire = now.clone().add(15, "minutes");

        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: order.totalPrice,
            vnp_IpAddr: '13.160.92.202',
            vnp_TxnRef: order.orderCode,
            vnp_OrderInfo: 'Thanh toan don hang ' + order._id,
            vnp_OrderType: "other",
            vnp_ReturnUrl: "http://localhost:3000/checkout/success",
            vnp_Locale: "vn",
            vnp_CreateDate: now.format("YYYYMMDDHHmmss"),
            vnp_ExpireDate: expire.format("YYYYMMDDHHmmss"),
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
// module.exports.paymentCallback = async (req, res) => {
//     try {
//         // Lấy toàn bộ tham số từ query
//         const vnp_Params = req.query;

//         // Lưu lại vnp_SecureHash để xác minh
//         const secureHash = vnp_Params["vnp_SecureHash"];
//         delete vnp_Params["vnp_SecureHash"];

//         // Sắp xếp lại tham số theo thứ tự alphabet để tạo chuỗi hash
//         const sortedParams = Object.keys(vnp_Params).sort().map(key => `${key}=${vnp_Params[key]}`).join("&");

//         // Tạo hash để so sánh với vnp_SecureHash
//         const hash = crypto.createHmac("sha512", secretKey).update(sortedParams).digest("hex");

//         // Kiểm tra chữ ký có hợp lệ không
//         if (hash !== secureHash) {
//             return res.status(400).json({ message: "Chữ ký không hợp lệ!" });
//         }

//         // Kiểm tra trạng thái giao dịch
//         if (vnp_Params["vnp_ResponseCode"] === "00" && vnp_Params["vnp_TransactionStatus"] === "00") {
//             const orderId = vnp_Params["vnp_TxnRef"]; // Mã đơn hàng
//             const amount = parseInt(vnp_Params["vnp_Amount"]) / 100; // Chuyển từ VND về đúng giá trị

//             // Cập nhật trạng thái đơn hàng trong database
//             const order = await Order.findOneAndUpdate(
//                 { orderId },
//                 { status: "paid", paymentInfo: vnp_Params },
//                 { new: true }
//             );

//             if (!order) {
//                 return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
//             }

//             return res.json({ message: "Thanh toán thành công!", order });
//         } else {
//             return res.status(400).json({ message: "Giao dịch không thành công!" });
//         }
//     } catch (error) {
//         console.error("Lỗi xử lý thanh toán:", error);
//         return res.status(500).json({ message: "Lỗi server!" });
//     }
// };