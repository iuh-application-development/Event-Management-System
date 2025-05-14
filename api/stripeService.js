const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Log để kiểm tra khóa
console.log("Stripe key được cấu hình:", !!process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("CẢNH BÁO: STRIPE_SECRET_KEY không được tìm thấy trong biến môi trường!");
}

/**
 * Tạo payment intent với Stripe
 * @param {number} amount - Số tiền thanh toán (đơn vị: VND)
 * @param {Object} metadata - Thông tin metadata cho payment intent
 */
const createPaymentIntent = async (amount, metadata = {}) => {
  // Validate input
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error(`Số tiền không hợp lệ: ${amount}`);
  }

  // Chuyển đổi VNĐ sang USD với tỷ giá xấp xỉ (Stripe không hỗ trợ VND trực tiếp)
  // 1 USD ~ 24,000 VND (tỷ giá có thể thay đổi, cần cập nhật)
  const amountInUSD = Math.round(amount / 24000 * 100) / 100;
  
  // Chuyển đổi sang cents (đơn vị Stripe sử dụng)
  const amountInCents = Math.round(amountInUSD * 100);

  // Double check amount is valid
  if (amountInCents <= 0) {
    throw new Error(`Số tiền chuyển đổi không hợp lệ: ${amountInCents} cents`);
  }

  try {
    // Add idempotency key to prevent duplicate charges
    const idempotencyKey = metadata.idempotencyKey || `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        ...metadata,
        amountVND: amount
      },
      payment_method_types: ['card'],
    }, {
      idempotencyKey: idempotencyKey
    });

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error('Không nhận được client secret từ Stripe');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
  } catch (error) {
    console.error('Lỗi khi tạo payment intent:', error);
    throw error;
  }
};

/**
 * Xác nhận payment intent thành công
 * @param {string} paymentIntentId - ID của payment intent
 */
const confirmPaymentSuccess = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === 'succeeded';
  } catch (error) {
    console.error('Lỗi khi xác nhận payment intent:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPaymentSuccess
};