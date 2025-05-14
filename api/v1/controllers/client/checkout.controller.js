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
    const userId = req.user._id;

    const cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
        return res.json({
            code: 400,
            message: "Giỏ hàng không tồn tại"
        });
    }

    const processedCart = {
        _id: cart._id,
        user_id: cart.user_id,
        tours: [],
        hotels: [],
        totalPrice: 0
    };

    // Xử lý tour
    for (const item of cart.tours) {
        const tourInfo = await Tour.findById(item.tour_id).select("-timeStarts");
        if (!tourInfo) continue;

        const priceNew = tourHelper.priceNewTour(tourInfo);
        const tourProcessed = {
            tour_id: item.tour_id,
            tourInfo,
            priceNew,
            timeStarts: []
        };
        for (const timeStart of item.timeStarts) {
            const totalPrice = timeStart.stock * parseInt(priceNew);

            tourProcessed.timeStarts.push({
                timeDepart: timeStart.timeDepart,
                quantity: timeStart.quantity,
                totalPrice: totalPrice
            })
            processedCart.totalPrice += totalPrice;
        }

        if (tourProcessed.timeStarts.length > 0) {
            processedCart.tours.push(tourProcessed);
        }
    }

    // Xử lý hotels & rooms
    for (const hotelItem of cart.hotels) {
        const hotelInfo = await Hotel.findById(hotelItem.hotel_id);
        if (!hotelInfo) continue;

        const hotelProcessed = {
            hotel_id: hotelItem.hotel_id,
            hotelInfo,
            rooms: []
        };

        for (const roomItem of hotelItem.rooms) {
            const roomInfo = await Room.findById(roomItem.room_id);
            if (!roomInfo) continue;

            const total = roomItem.quantity * roomInfo.price;

            hotelProcessed.rooms.push({
                room_id: roomItem.room_id,
                roomInfo,
                quantity: roomItem.quantity,
                price: roomInfo.price,
                totalPrice: total
            });

            processedCart.totalPrice += total;
        }

        if (hotelProcessed.rooms.length > 0) {
            processedCart.hotels.push(hotelProcessed);
        }
    }

    res.json(processedCart);
};


//[POST] api/v1/checkout/order
module.exports.order = async (req, res) => {
    const cartId = req.cart.id;
    const { fullName, phone, email, note, voucherCode } = req.body;

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

        if (!tourInfo) {
            return res.json({
                code: "400",
                message: "Tour không tồn tại!"
            });
        }
        const priceNew = tourHelper.priceNewTour(tourInfo);

        const timeStarts = [];
        for (const timeStart of tour.timeStarts) {
            const tourTime = tour.timeStarts.find(item =>
                new Date(item.timeDepart).getTime() === new Date(timeStart.timeDepart).getTime() &&
                new Date(timeStart.timeDepart) >= Date.now()
            );

            if (!tourTime) {
                return res.json({
                    code: "400",
                    message: "Thời gian khởi hành tour không hợp lệ! hoặc đã quá ngày!"
                });
            }

            const itemTotal = timeStart.stock * priceNew;

            timeStarts.push({
                timeDepart: new Date(timeStart.timeDepart),
                stock: timeStart.stock
            });

            totalPrice += itemTotal;

            await Tour.updateOne(
                {
                    _id: tour.tour_id,
                    "timeStarts.timeDepart": new Date(timeStart.timeDepart)
                },
                {
                    $inc: {
                        sold: timeStart.stock,
                        "timeStarts.$[time].stock": -timeStart.stock
                    }
                }, {
                arrayFilters: [{ "time.timeDepart": new Date(timeStart.timeDepart) }]
            });
        }

        tours.push({
            tour_id: tour.tour_id,
            price: tourInfo.price,
            discount: tourInfo.discount,
            timeStarts: timeStarts,
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
        userInfor: { fullName, phone, email, note },
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

        if (req.user.id !== order.user_id) {
            return res.json({
                code: 400,
                message: "Bạn không có quyền truy cập vào đơn hàng này!"
            });
        }

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
    const subject = `Cảm ơn ${order.userInfor.fullName} đã tin tưởng dịch vụ của chúng tôi!`;
    const html = `
        <p>Chào <strong>${order.userInfor.fullName}</strong>,</p>
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

    sendMailHelper.sendMail(order.userInfor.email, subject, html);


    return res.json({
        code: 200,
        message: 'Thanh toán thành công',
        order: order
    });
};

// [PATCH] api/v1/checkout/cancel/:orderId
module.exports.cancel = async (req, res) => {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (req.user.id !== order.user_id) {
        return res.json({
            code: 400,
            message: "Bạn không có quyền hủy đơn hàng này!"
        });
    }

    if (!order) {
        return res.json({
            code: 400,
            message: "Không tìm thấy đơn hàng!"
        });
    }

    const now = new Date();
    const updatedAt = new Date(order.updatedAt);

    updatedAt.setDate(updatedAt.getDate() + 2);

    if (now > updatedAt) {
        return res.json({
            code: 400,
            message: 'Không thể hủy đơn hàng sau 2 ngày kể từ khi đặt'
        });
    }

    // Kiểm tra thời gian khởi hành tour (dưới 3 ngày)
    const checkDayTour = new Date(now);
    checkDayTour.setDate(checkDayTour.getDate() + 3);
    const hasNearDepartTour = order.tours.some(tour =>
        tour.timeStarts.some(time => new Date(time.timeDepart) <= checkDayTour)
    );
    if (hasNearDepartTour) {
        return res.json({
            code: 400,
            message: 'Không thể hủy tour khi trước ngày khởi hành còn dưới 3 ngày'
        });
    }

    order.status = 'cancelled';
    order.inforCancel.numberAccount = req.body.numberAccount;
    order.inforCancel.bankName = req.body.bankName;

    // tours
    for (const tour of order.tours) {
        for (const timeStart of tour.timeStarts) {
            await Tour.updateOne(
                {
                    _id: tour.tour_id,
                    "timeStarts.timeDepart": new Date(timeStart.timeDepart)
                },
                {
                    $inc: {
                        sold: -timeStart.stock,
                        "timeStarts.$[time].stock": timeStart.stock
                    }
                },
                { arrayFilters: [{ "time.timeDepart": new Date(timeStart.timeDepart) }] }
            );
        }
    }

    // hotels
    for (const hotel of order.hotels) {
        for (const room of hotel.rooms) {
            await Room.updateOne(
                { _id: room.room_id },
                {
                    $inc: {
                        sold: -room.quantity,
                        availableRooms: room.quantity
                    }
                }
            );

            await Hotel.updateOne(
                { _id: hotel.hotel_id },
                {
                    $inc: {
                        sold: -room.quantity,
                    }
                }
            );
        }
    }


    // gửi mail xác nhận đã hủy đơn hàng qua email user
    const subject = `Xác nhận đã hủy đơn hàng thành công!`;
    const html = `
            <p>Xin chào <strong>${req.user.fullName}</strong>,</p>
            <p>
            Đơn hàng <strong>${order.orderCode}</strong> của bạn đã được hủy thành công.<br>
             Chúng tôi sẽ hoàn tiền lại trong vòng 24h!
            </p>
            <p>
            Nếu có bất kỳ thắc mắc nào, bạn vui lòng liên hệ với chúng tôi qua số điện thoại 
            <strong>${req.settingGeneral.phone}</strong> hoặc email <strong>${req.settingGeneral.email}</strong>.
            </p>
            <p>Chúng tôi rất mong sẽ có cơ hội đồng hành cùng bạn trong những chuyến đi tiếp theo!</p>
            <p>Trân trọng,<br>
            <strong>${req.settingGeneral.websiteName}</strong></p>
        `;

    sendMailHelper.sendMail(req.user.email, subject, html);

    await order.save();

    return res.json({
        code: 200,
        message: 'Hủy đơn hàng thành công',
        order: {
            _id: order._id,
            orderCode: order.orderCode,
            status: order.status,
            updatedAt: order.updatedAt,
            numberAccount: req.body.numberAccount,
            bankName: req.body.bankName
        },
    });
};