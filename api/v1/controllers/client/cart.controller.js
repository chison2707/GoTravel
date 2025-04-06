const Cart = require("../../models/cart.model");
const Tour = require("../../models/tour.model");
const tourHelper = require("../../helper/tours");
const Hotel = require("../../models/hotel.model");
const Room = require("../../models/room.model");

// [POST] /api/v1/carts/add/:tour_id
module.exports.addPost = async (req, res) => {
    const tourId = req.params.tour_id;
    const quantity = parseInt(req.body.quantity);
    const cartId = req.cart.id;

    if (!quantity || quantity <= 0) {
        return res.status(400).json({
            code: 400,
            message: "Số lượng không hợp lệ"
        });
    }

    const cart = await Cart.findOne({
        _id: cartId
    });
    const tour = await Tour.findOne({ _id: tourId });
    const existTourInCart = cart.tours.find(item => item.tour_id === tourId);

    if (existTourInCart) {
        const quantityNew = quantity + existTourInCart.quantity;
        if (quantityNew > tour.stock) {
            return res.json({
                code: 400,
                message: "Số lượng tour trong giỏ hàng vượt quá số lượng tour đang có"
            });
        }
        const data = await Cart.findOneAndUpdate({
            _id: cartId,
            "tours.tour_id": tourId
        }, {
            $set: {
                "tours.$.quantity": quantityNew
            }
        }, { new: true });
        res.json({
            code: 200,
            message: "Thêm giỏ hàng thành công",
            data: data
        });
    } else {
        const objectCart = {
            tour_id: tourId,
            quantity: quantity
        }
        const data = await Cart.findOneAndUpdate(
            {
                _id: cartId
            },
            {
                $push: { tours: objectCart }
            }, { new: true }
        );
        res.json({
            code: 200,
            message: "Thêm giỏ hàng thành công",
            data: data
        });
    }
}

// [POST] /api/v1/carts/add/:hotel_id/:room_id
module.exports.addPostHotel = async (req, res) => {
    const hotelId = req.params.hotel_id;
    const roomId = req.params.room_id;
    const quantity = parseInt(req.body.quantity);
    const cartId = req.cart.id;

    if (!quantity || quantity <= 0) {
        return res.status(400).json({
            code: 400,
            message: "Số lượng không hợp lệ"
        });
    }

    const cart = await Cart.findOne({
        _id: cartId
    });
    const hotel = await Hotel.findOne({ _id: hotelId });
    const room = await Room.findOne({ _id: roomId });
    const existHotelInCart = cart.hotels.find(item => item.hotel_id === hotelId && item.room_id === roomId);

    if (existHotelInCart) {
        const quantityNew = quantity + existHotelInCart.quantity;
        if (quantityNew > room.availableRooms) {
            return res.json({
                code: 400,
                message: "Số lượng phòng trong giỏ hàng vượt quá số lượng phòng đang trống"
            });
        }
        const data = await Cart.findOneAndUpdate({
            _id: cartId,
            "hotels.hotel_id": hotelId,
            "hotels.room_id": roomId
        }, {
            $set: {
                "hotels.$.quantity": quantityNew
            }
        }, { new: true });
        res.json({
            code: 200,
            message: "Thêm giỏ hàng thành công",
            data: data
        });
    } else {
        const objectCart = {
            hotel_id: hotelId,
            room_id: roomId,
            quantity: quantity
        }
        const data = await Cart.findOneAndUpdate(
            {
                _id: cartId
            },
            {
                $push: { hotels: objectCart }
            }, { new: true }
        );
        res.json({
            code: 200,
            message: "Thêm giỏ hàng thành công",
            data: data
        });
    }

}

// [GET] /api/v1/carts/
module.exports.index = async (req, res) => {
    const userId = req.user._id;


    const cart = await Cart.findOne({
        user_id: userId
    });

    const processedCart = {
        _id: cart._id,
        user_id: cart.user_id,
        tours: [],
        hotels: [],
        totalPrice: 0
    };

    if (cart.tours.length > 0) {
        for (const item of cart.tours) {
            const tourId = item.tour_id;

            const tourInfo = await Tour.findOne({
                _id: tourId
            });

            if (tourInfo) {
                const priceNew = tourHelper.priceNewTour(tourInfo);
                const totalPrice = item.quantity * priceNew;

                processedCart.tours.push({
                    tour_id: tourId,
                    quantity: item.quantity,
                    tourInfo: tourInfo,
                    priceNew: priceNew,
                    totalPrice: totalPrice
                });


                processedCart.totalPrice += totalPrice;
            }

        }
    }

    // Xử lý hotel
    if (cart.hotels.length > 0) {
        for (const item of cart.hotels) {
            const hotelInfo = await Hotel.findById(item.hotel_id);
            const roomInfo = await Room.findById(item.room_id);

            if (hotelInfo && roomInfo) {
                const total = item.quantity * roomInfo.price;

                processedCart.hotels.push({
                    hotel_id: item.hotel_id,
                    room_id: item.room_id,
                    quantity: item.quantity,
                    hotelInfo,
                    roomInfo,
                    price: roomInfo.price,
                    totalPrice: total
                });

                processedCart.totalPrice += total;
            }
        }
    }

    res.json(processedCart);
}

// // [PATCH] /api/v1/carts/add/:tour_id
module.exports.delete = async (req, res) => {
    const cartId = req.cookies.cartId;
    const tourId = req.params.tour_id;

    await Cart.updateOne({
        _id: cartId
    }, {
        "$pull": { tours: { "tour_id": tourId } }
    });

    res.json({
        code: 200,
        message: "Xóa tour khỏi giỏ hàng thành công",
    });

}

// [PATCH] /api/v1/carts/update/:tour_id/:quantity
module.exports.update = async (req, res) => {
    const cartId = req.cookies.cartId;
    const tourId = req.params.tour_id;
    const quantity = parseInt(req.params.quantity);

    const tour = await Tour.findOne({
        _id: tourId
    });
    if (quantity < 1 || quantity > tour.stock) {
        return res.json({
            code: 400,
            message: "Số lượng tour không hợp lệ"
        });
    }

    await Cart.updateOne({
        _id: cartId,
        "tours.tour_id": tourId
    }, {
        $set: {
            "tours.$.quantity": quantity
        }
    })

    res.json({
        code: 200,
        message: "Cập nhật số lượng giỏ hàng thành công",
    });
}