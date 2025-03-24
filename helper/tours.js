module.exports.priceNewTour = (tour) => {
    const priceNew = (tour.price * (100 - tour.discount) / 100).toFixed(0);

    return priceNew;
}