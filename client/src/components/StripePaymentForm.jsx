import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};

// Chỉ dùng cho mục đích test, xóa đi sau khi xác định lỗi
const TEST_CLIENT_SECRET = "pi_3PRLmmePwKhP5Ycw1zjbp3JQ_secret_8VDafKhxO5JQVf4RaW16yCrXx";

export default function StripePaymentForm({ amount, eventId, eventName, onSuccess, ticketDetails }) {
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Tạo Payment Intent khi component mount
    const createPaymentIntent = async () => {
      try {
        // Đảm bảo token Firebase được gửi
        const token = localStorage.getItem('firebaseToken');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axios.post('/create-payment-intent', {
          amount,
          eventId,
          eventName,
          userId: ticketDetails.userid,
          userEmail: ticketDetails.ticketDetails.email,
          userName: ticketDetails.ticketDetails.name
        });
        
        setClientSecret(response.data.clientSecret);
        setPaymentIntentId(response.data.id);
      } catch (err) {
        console.error('Lỗi khi tạo payment intent:', err);
        setError('Không thể khởi tạo thanh toán. Vui lòng thử lại sau.');
      }
    };
    
    if (amount && eventId) {
      createPaymentIntent();
    }

    if (!clientSecret && TEST_CLIENT_SECRET) {
      console.log("Sử dụng client secret thử nghiệm");
      setClientSecret(TEST_CLIENT_SECRET);
    }
  }, [amount, eventId, ticketDetails, clientSecret]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError("Stripe.js chưa được tải xong. Vui lòng thử lại sau.");
      return;
    }
    
    // Kiểm tra client secret trước khi xử lý
    if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
      console.error("Client secret không hợp lệ:", clientSecret);
      setError("Không thể khởi tạo thanh toán. Client secret không hợp lệ.");
      return;
    }

    setProcessing(true);
    
    try {
      console.log("Xác nhận thanh toán với client secret:", clientSecret);
      
      // Xác thực card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: ticketDetails.ticketDetails.name,
            email: ticketDetails.ticketDetails.email,
          },
        }
      });
      
      console.log("Kết quả xử lý payment:", result);
      
      if (result.error) {
        // Hiển thị lỗi chi tiết
        throw new Error(result.error.message);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          // Tiếp tục xử lý như cũ
          console.log('Payment succeeded:', result.paymentIntent);
          
          // Gọi API để xác nhận và tạo vé
          const confirmResponse = await axios.post('/confirm-payment', {
            paymentIntentId,
            ticketDetails
          });
          
          if (confirmResponse.data.success) {
            // Thông báo thành công và chuyển hướng
            onSuccess(confirmResponse.data);
          } else {
            setError('Thanh toán thành công nhưng không thể tạo vé. Vui lòng liên hệ hỗ trợ.');
          }
        } else {
          throw new Error(`Trạng thái payment intent không thành công: ${result.paymentIntent.status}`);
        }
      }
    } catch (err) {
      console.error('Chi tiết lỗi khi xử lý thanh toán:', err);
      
      // Hiển thị thông báo lỗi cụ thể
      setError(err.message || 'Đã xảy ra lỗi khi xử lý thanh toán.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      {!clientSecret ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin mr-2">⟳</div>
          <span>Đang khởi tạo thanh toán...</span>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thông tin thẻ
            </label>
            <div className="border border-gray-300 rounded-md p-4 bg-white">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Thông tin thẻ của bạn được bảo mật bởi Stripe. Chúng tôi không lưu trữ thông tin thẻ.
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="flex justify-between items-center border-t border-gray-200 pt-4">
            <div>
              <p className="text-lg font-semibold">Tổng thanh toán:</p>
              <p className="text-2xl font-bold text-blue-600">{amount.toLocaleString('vi-VN')} VNĐ</p>
            </div>
            
            <button 
              type="submit" 
              className={`${processing ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white px-6 py-3 rounded-md transition`}
              disabled={processing || !stripe}
            >
              {processing ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Đang xử lý...
                </>
              ) : (
                'Thanh toán'
              )}
            </button>
          </div>
        </>
      )}
    </form>
  );
}