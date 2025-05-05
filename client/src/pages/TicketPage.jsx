import { Link } from "react-router-dom";
import { IoMdArrowBack } from 'react-icons/io';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useEffect, useState } from "react";
import axios from "axios";
import { useFirebaseAuth } from "../FirebaseAuthContext";

export default function TicketPage() {
  const { user } = useFirebaseAuth();
  const [userTickets, setUserTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Thêm timeout để đảm bảo người dùng có thể thấy nội dung đang tải
    const timer = setTimeout(() => {
      if (user && user._id) {
        fetchTickets();
      } else {
        console.log("Chưa có thông tin người dùng:", user);
        setLoading(false);
      }
    }, 500); // Đợi 500ms để đảm bảo user được tải
    
    return () => clearTimeout(timer);
  }, [user]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Đảm bảo token được thêm vào header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`Đang tải vé cho người dùng ID: ${user._id}`);
      const response = await axios.get(`/tickets/user/${user._id}`);
      console.log("Dữ liệu vé nhận được:", response.data);
      
      if (Array.isArray(response.data)) {
        setUserTickets(response.data);
      } else {
        console.warn("Phản hồi không phải mảng:", response.data);
        setUserTickets([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải vé:", err);
      
      if (err.response?.status === 401) {
        setError("Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        setError("Không thể tải danh sách vé. " + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm("Bạn có chắc muốn hủy vé này không?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      await axios.delete(`/tickets/${ticketId}`);
      
      // Cập nhật danh sách vé sau khi xóa
      setUserTickets(userTickets.filter(ticket => ticket._id !== ticketId));
      alert("Vé đã được hủy thành công!");
    } catch (err) {
      console.error("Lỗi khi hủy vé:", err);
      alert("Không thể hủy vé: " + (err.response?.data?.error || err.message));
    }
  };

  // Hiển thị trạng thái đang tải
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-3">Đang tải vé của bạn...</p>
      </div>
    );
  }

  // Hiển thị lỗi nếu có
  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Vé của tôi</h1>
          
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Lỗi! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800">
              <IoMdArrowBack className="mr-1" /> Quay lại trang chủ
            </Link>
            
            {error.includes("đăng nhập") && (
              <Link to="/login" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                Đăng nhập lại
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị khi chưa đăng nhập
  if (!user) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Vé của tôi</h1>
          
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Lưu ý! </strong>
            <span className="block sm:inline">Vui lòng đăng nhập để xem vé của bạn.</span>
          </div>
          
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800">
              <IoMdArrowBack className="mr-1" /> Quay lại trang chủ
            </Link>
            
            <Link to="/login" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị khi không có vé
  if (userTickets.length === 0) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Vé của tôi</h1>
          
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Thông báo! </strong>
            <span className="block sm:inline">Bạn chưa đặt vé cho sự kiện nào.</span>
          </div>
          
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800">
              <IoMdArrowBack className="mr-1" /> Khám phá sự kiện
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị danh sách vé
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Vé của tôi</h1>
        
        <div className="mb-4">
          <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 w-fit">
            <IoMdArrowBack className="mr-1" /> Quay lại trang chủ
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userTickets.map(ticket => (
            <div key={ticket._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="p-4 bg-blue-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold">{ticket.ticketDetails.eventname}</h2>
                <p className="text-gray-600 text-sm">Mã vé: {ticket.ticketId}</p>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-1 gap-2">
                  <p><span className="font-medium">Người mua:</span> {ticket.ticketDetails.name}</p>
                  <p><span className="font-medium">Email:</span> {ticket.ticketDetails.email}</p>
                  <p><span className="font-medium">Số điện thoại:</span> {ticket.ticketDetails.contactNo}</p>
                  <p><span className="font-medium">Ngày:</span> {new Date(ticket.ticketDetails.eventdate).toLocaleDateString('vi-VN')}</p>
                  <p><span className="font-medium">Giờ:</span> {ticket.ticketDetails.eventtime}</p>
                  <p><span className="font-medium">Giá vé:</span> {ticket.ticketDetails.ticketprice.toLocaleString('vi-VN')} VNĐ</p>
                </div>
              </div>
              
              {ticket.ticketDetails.qr && (
                <div className="p-4 flex justify-center border-t border-gray-200">
                  <img 
                    src={ticket.ticketDetails.qr} 
                    alt="QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              )}
              
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <span className={`px-3 py-1 rounded-full text-sm ${ticket.checkedIn ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {ticket.checkedIn ? 'Đã sử dụng' : 'Chưa sử dụng'}
                </span>
                
                {!ticket.checkedIn && (
                  <button
                    onClick={() => handleDeleteTicket(ticket._id)}
                    className="flex items-center text-red-600 hover:text-red-800"
                    title="Hủy vé"
                  >
                    <RiDeleteBinLine className="mr-1" /> Hủy vé
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}