const Cart = require("../../models/cart.model");
const Tour = require("../../models/tour.model");
const Order = require("../../models/order.model");
const Voucher = require("../../models/voucher.model");
const Hotel = require("../../models/hotel.model");
const Room = require("../../models/room.model");
const tourHelper = require("../../helper/tours");
const generate = require("../../helper/generate");
const vnpay = require('../../../../config/vnpay');
const sendMailHelper = require("../../helper/sendMail");
const moment = require("moment");

//[GET] api/v1/checkout
module.exports.index = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ user_id: userId }).lean();
        if (!cart || (!cart.tours.length && !cart.hotels.length)) {
            return res.json({
                _id: null,
                user_id: userId,
                tours: [],
                hotels: [],
                totalPrice: 0
            });
        }

        let totalPrice = 0;

        // ===== Xử lý Tours =====
        const tourIds = cart.tours.map(item => item.tour_id);
        const tours = await Tour.find({ _id: { $in: tourIds } }).lean();

        const processedTours = cart.tours.map(item => {
            const tourInfo = tours.find(t => t._id.toString() === item.tour_id.toString());
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
        }).filter(Boolean);

        // ===== Xử lý Hotels =====
        const hotelIds = cart.hotels.map(h => h.hotel_id);
        const hotels = await Hotel.find({ _id: { $in: hotelIds } }).lean();

        const processedHotels = [];

        for (const hotelCart of cart.hotels) {
            const hotelInfo = hotels.find(h => h._id.toString() === hotelCart.hotel_id.toString());
            if (!hotelInfo) continue;

            // ===== Xử lý Rooms =====
            const processedRooms = [];

            for (const roomCart of hotelCart.rooms) {
                const roomInfo = await Room.findOne({
                    _id: roomCart.room_id
                });
                if (!roomInfo) continue;

                const price = roomInfo.price;
                const total = roomCart.quantity * price;
                totalPrice += total;

                processedRooms.push({
                    room_id: roomCart.room_id,
                    quantity: roomCart.quantity,
                    roomInfo,
                    price,
                    totalPrice: total
                });
            }

            processedHotels.push({
                hotel_id: hotelCart.hotel_id,
                hotelInfo,
                rooms: processedRooms
            });
        }

        res.json({
            _id: cart._id,
            user_id: cart.user_id,
            tours: processedTours,
            hotels: processedHotels,
            totalPrice
        });
    } catch (error) {
        console.error(error);
        res.json({
            code: "500",
            message: "Lỗi khi xử lý giỏ hàng: " + error.message
        });
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
    if (!cart || (cart.tours.length === 0 && cart.hotels.length === 0)) {
        return res.json({
            code: "400",
            message: "Giỏ hàng trống!"
        });
    }
    let totalPrice = 0;
    let discountAmount = 0;
    let tours = [];
    let hotels = [];

    // xử lý tour
    for (const tour of cart.tours) {
        const tourInfo = await Tour.findOne({
            _id: tour.tour_id
        });

        if (!tourInfo || tourInfo.stock < tour.quantity) {
            return res.json({
                code: "400",
                message: "Tour không tồn tại! hoặc số lượng tour hiện tại không đủ!"
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

    // xử lý hotel
    for (const hotel of cart.hotels) {
        const hotelInfo = await Hotel.findById(hotel.hotel_id);

        if (!hotelInfo) {
            return res.json({
                code: "400",
                message: "Hotel không tồn tại!"
            });
        }
        const rooms = [];
        for (const room of hotel.rooms) {
            const roomInfo = await Room.findById(room.room_id);

            if (!roomInfo || roomInfo.availableRooms < room.quantity) {
                return res.json({
                    code: "400",
                    message: "Room không tồn tại! hoặc số lượng phòng hiện tại không đủ!"
                });
            }

            const price = roomInfo.price;
            const total = room.quantity * price;
            totalPrice += total;

            rooms.push({
                room_id: room.room_id,
                quantity: room.quantity,
                price,
            });


            await Room.updateOne(
                { _id: room.room_id },
                {
                    $inc: {
                        sold: room.quantity,
                        availableRooms: -room.quantity
                    }
                });
        }
        const totalRoomQuantity = rooms.reduce((acc, r) => acc + r.quantity, 0);

        await Hotel.updateOne(
            { _id: hotel.hotel_id },
            {
                $inc: {
                    sold: totalRoomQuantity,
                }
            });

        hotels.push({
            hotel_id: hotel.hotel_id,
            hotelInfo,
            rooms: rooms
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
        hotels,
        voucherCode: voucherCode,
        totalPrice,
        updateBy: []
    });

    const savedOrder = await newOrder.save();

    await Cart.updateOne({
        _id: cart._id
    }, {
        tours: [],
        hotels: []
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
            vnp_IpAddr: req.ip || "127.0.0.1",
            vnp_TxnRef: order.orderCode,
            vnp_OrderInfo: 'Thanh toan don hang ' + order._id,
            vnp_OrderType: "other",
            vnp_ReturnUrl: "http://localhost:3000/api/v1/checkout/success",
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
module.exports.paymentCallback = async (req, res) => {
    let verify;
    try {
        verify = vnpay.verifyReturnUrl(req.query);
        if (!verify.isVerified) {
            return res.json({
                code: 400,
                message: 'Xác thực tính toàn vẹn dữ liệu thất bại'
            });
        }
        if (!verify.isSuccess) {
            return res.json({
                code: 400,
                message: 'Đơn hàng thanh toán thất bại'
            });
        }
    } catch (error) {
        return res.json({
            code: 500,
            message: 'Dữ liệu không hợp lệ'
        });
    }

    // Kiểm tra thông tin đơn hàng và xử lý tương ứng
    const orderCode = verify.vnp_TxnRef;
    const order = await Order.findOneAndUpdate(
        { orderCode: orderCode },
        { status: "paid", paymentInfo: verify },
        { new: true }
    );
    // gửi otp qua email user
    const subject = `Cảm ơn ${req.user.fullName} đã tin tưởng dịch vụ của chúng tôi!`;
    const html = `
        <p>Chào <strong>${req.user.fullName}</strong>,</p>
        <p>
            Cảm ơn bạn đã đặt dịch vụ tại <strong>${req.settingGeneral.websiteName}</strong>!<br>
            Chúng tôi rất vui được bạn tin tưởng chọn dịch vụ của chúng tôi.
        </p>
        <p>
            Mọi thắc mắc, bạn cứ liên hệ tụi mình qua <strong>${req.settingGeneral.phone}</strong> hoặc <strong>${req.settingGeneral.email}</strong>.
        </p>
        <p>Hy vọng sớm được gặp bạn!</p>
        <p>Thân mến,<br>
        <strong>${req.settingGeneral.websiteName}</strong></p>`;

    sendMailHelper.sendMail(req.user.email, subject, html);


    return res.json({
        code: 200,
        message: 'Thanh toán thành công',
        order: order
    });
};