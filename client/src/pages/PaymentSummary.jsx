/* eslint-disable no-unused-vars */
import axios from 'axios';
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom';
import { IoMdArrowBack } from 'react-icons/io'
import { useFirebaseAuth } from "../FirebaseAuthContext";
import QRCode from 'qrcode';

export default function PaymentSummary() {
  const {id} = useParams();
  const {user} = useFirebaseAuth(); // Sử dụng Firebase Auth
  const [event, setEvent] = useState(null);
  const [redirect, setRedirect] = useState('');
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState({
    name: '',
    email: '',
    contactNo: ''
  });
  const [payment, setPayment] = useState({
    nameOnCard: 'A.B.S.L. Perera',
    cardNumber: '5648 3212 7802',
    expiryDate: '12/25',
    cvv: '532'
  });
  
  const [ticketDetails, setTicketDetails] = useState({
    userid: '', // Sẽ được cập nhật khi có user
    eventId: id,
    ticketDetails: {
      eventname: '',
      eventdate: '',
      eventtime: '',
      name: '', // Sẽ được cập nhật từ form
      email: '', // Sẽ được cập nhật từ form
      contactNo: '', // Sẽ được cập nhật từ form
      ticketprice: 0,
      qr: ''
    }
  });
  
  // Xử lý khi thay đổi input thông tin người dùng
  const handleChangeDetails = (e) => {
    const { name, value } = e.target;
    setDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Xử lý khi thay đổi input thông tin thanh toán
  const handleChangePayment = (e) => {
    const { name, value } = e.target;
    setPayment(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Lấy thông tin sự kiện
  useEffect(() => {
    if (!id) return;
    axios.get(`/event/${id}/ordersummary/paymentsummary`)
      .then(response => {
        setEvent(response.data);
        // Cập nhật thông tin sự kiện vào ticketDetails
        setTicketDetails(prev => ({
          ...prev,
          ticketDetails: {
            ...prev.ticketDetails,
            eventname: response.data.title,
            eventdate: response.data.eventDate,
            eventtime: response.data.eventTime,
            ticketprice: response.data.ticketPrice
          }
        }));
      });
  }, [id]);
  
  // Cập nhật thông tin người dùng khi user thay đổi
  useEffect(() => {
    if (user && user._id) {
      // Cập nhật state details và ticketDetails với thông tin người dùng
      setDetails(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Hàm tạo vé
  const createTicket = async (e) => {
    e.preventDefault();
    
    if (!user || !user._id) {
      alert("Vui lòng đăng nhập để mua vé!");
      return;
    }
    
    // Kiểm tra các trường bắt buộc
    if (!details.name || !details.email) {
      alert("Vui lòng điền đầy đủ thông tin người mua vé!");
      return;
    }
    
    setLoading(true);
    
    try {
      // Đảm bảo token Firebase được thêm vào header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Cập nhật thông tin từ form vào ticketDetails
      const updatedTicketDetails = {
        userid: user._id, // Đảm bảo có userId hợp lệ
        eventId: id,
        ticketDetails: {
          eventname: event.title,
          eventdate: event.eventDate,
          eventtime: event.eventTime,
          name: details.name, // Lấy từ form
          email: details.email, // Lấy từ form
          contactNo: details.contactNo || '',
          ticketprice: event.ticketPrice,
          qr: "placeholder" // Tạm thời đặt placeholder
        }
      };
      
      // Gửi request tạo vé
      const response = await axios.post('/tickets', updatedTicketDetails);
      const newTicket = response.data.ticket;
      const officialTicketId = newTicket.ticketId;
      
      // Tạo QR code với ticketId chính thức
      const qrCode = await generateQRCode(
        newTicket.ticketDetails.eventname,
        newTicket.ticketDetails.name,
        newTicket.eventId,
        officialTicketId
      );
      
      // Cập nhật vé với QR code chính xác
      await axios.put(`/tickets/${newTicket._id}/update-qr`, { qr: qrCode });
      
      alert(`Đã tạo vé thành công! Vé ID: ${newTicket._id}\nUserID: ${user._id}`);
      console.log("Thông tin vé:", newTicket);
      console.log("User ID sử dụng:", user._id);

      setTimeout(() => {
        setRedirect(true);
      }, 1000);

    } catch (error) {
      console.error('Error creating ticket:', error);
      alert("Không thể tạo vé: " + (error.response?.data?.details || error.message));
    } finally {
      setLoading(false);
    }
  };

  //! Helper function to generate QR code ------------------------------
  async function generateQRCode(eventName, userName, eventId, ticketId) {
    try {
      // Tạo chuỗi JSON với đầy đủ thông tin cần thiết
      const qrData = JSON.stringify({
        event: eventName,
        name: userName,
        eventId: eventId,
        ticketId: ticketId
      });
      
      const qrCode = await QRCode.toDataURL(qrData);
      return qrCode;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  if (redirect){
    return <Navigate to={'/wallet'} />
  }

  if (!event) {
    return <div className="text-center p-10">Đang tải...</div>;
  }

  return (
    <>
      <div>
        <Link to={'/event/'+event._id+ '/ordersummary'}>
          <button 
            className='
            inline-flex 
            mt-12
            gap-2
            p-3 
            ml-12
            bg-gray-100
            justify-center 
            items-center 
            text-blue-700
            font-bold
            rounded-sm'
          >
            <IoMdArrowBack 
              className='
              font-bold
              w-6
              h-6
              gap-2'
            /> 
            Back
          </button>
        </Link>
      </div>
      <div className="ml-12 bg-gray-100 shadow-lg mt-8 p-16 w-3/5 float-left">
        {/* Your Details */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold mb-4">Thông tin người mua vé</h2>
          <input
            type="text"
            name="name"
            value={details.name}
            onChange={handleChangeDetails}
            placeholder="Họ và tên"
            className="input-field ml-10 w-80 h-10 bg-gray-50 border border-gray-30 rounded-md p-2.5"
            required
          />
          <input
            type="email"
            name="email"
            value={details.email}
            onChange={handleChangeDetails}
            placeholder="Email"
            className="input-field w-80 ml-3 h-10 bg-gray-50 border border-gray-30 rounded-sm p-2.5"
            required
          />
          <div className="flex space-x-4">
            <input
              type="tel"
              name="contactNo"
              value={details.contactNo}
              onChange={handleChangeDetails}
              placeholder="Số điện thoại"
              className="input-field ml-10 w-80 h-10 bg-gray-50 border border-gray-30 rounded-sm p-2.5"
            />
          </div>
        </div>

        {/* Payment Option */}
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-bold mb-4">Payment Option</h2>
          <div className="ml-10">
            <button type="button" className="px-8 py-3 text-black bg-blue-100 focus:outline border rounded-sm border-gray-300" disabled>Credit / Debit Card</button>
          </div>
        
          <input
            type="text"
            name="nameOnCard"
            value={payment.nameOnCard}
            onChange={handleChangePayment}
            placeholder="Name on Card"
            className="input-field w-80 ml-10 h-10 bg-gray-50 border border-gray-30 rounded-sm p-2.5"
          />
          <input
            type="text"
            name="cardNumber"
            value={payment.cardNumber}
            onChange={handleChangePayment}
            placeholder="Card Number"
            className="input-field w-80 ml-3 h-10 bg-gray-50 border border-gray-30 rounded-sm p-2.5"
          />
          <div className="flex space-x-4">
            <div className="relative">
              <input
                type="text"
                name="expiryDate"
                value={payment.expiryDate}
                onChange={handleChangePayment}
                placeholder="Expiry Date (MM/YY)"
                className="input-field w-60 ml-10 h-10 bg-gray-50 border border-gray-30 rounded-sm p-2.5"
              />
            </div>
            <input
              type="text"
              name="cvv"
              value={payment.cvv}
              onChange={handleChangePayment}
              placeholder="CVV"
              className="input-field w-16 h-10 bg-gray-50 border border-gray-30 rounded-sm p-3"
            />
          </div>
          <div className="float-right">
            <p className="text-sm font-semibold pb-2 pt-8">Total : {event.ticketPrice}</p>
            <button 
              type="button" 
              onClick={createTicket}             
              disabled={loading}
              className="primary">
              {loading ? 'Đang xử lý...' : 'Make Payment'}
            </button>
          </div>
        </div>
      </div>
      <div className="float-right bg-blue-100 w-1/4 p-5 mt-8 mr-12">
        <h2 className="text-xl font-bold mb-8">Order Summary</h2>
        <div className="space-y-1">
          <div>
            <p className="float-right">1 Ticket</p>
          </div>
          <p className="text-lg font-semibold">{event.title}</p>
          <p className="text-xs">{event.eventDate.split("T")[0]},</p>
          <p className="text-xs pb-2">{event.eventTime}</p>
          <hr className="my-2 border-t pt-2 border-gray-400" />
          <p className="float-right font-bold">VND. {event.ticketPrice}</p>
          <p className="font-bold">Sub total: {event.ticketPrice}</p>
        </div>
      </div>
    </>
  );
}