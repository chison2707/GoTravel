const Cart = require("../../models/cart.model");
const Tour = require("../../models/tour.model");
const tourHelper = require("../../../../helper/tours");

// [POST] /api/v1/carts/add/:tour_id
module.exports.addPost = async (req, res) => {
    const tourId = req.params.tour_id;
    const quantity = parseInt(req.body.quantity);
    const cartId = req.cart.id;

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
        await Cart.updateOne({
            _id: cartId,
            "tours.tour_id": tourId
        }, {
            $set: {
                "tours.$.quantity": quantityNew
            }
        })
    } else {
        const objectCart = {
            tour_id: tourId,
            quantity: quantity
        }
        await Cart.updateOne(
            {
                _id: cartId
            },
            {
                $push: { tours: objectCart }
            }
        );
    }
    res.json({
        code: 200,
        message: "Thêm giỏ hàng thành công",
    });
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