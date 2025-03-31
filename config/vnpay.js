const { VNPay, ignoreLogger } = require("vnpay");

const vnpay = new VNPay({
    // Thông tin cấu hình bắt buộc
    tmnCode: 'M5UIQKTP',
    secureSecret: 'GJGLD64LCT6X3SDKH8LD7PTYW638TR39',
    vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',

    // Cấu hình tùy chọn
    testMode: true,
    hashAlgorithm: 'SHA512',
    enableLog: true,
    loggerFn: ignoreLogger,
});
module.exports = vnpay;