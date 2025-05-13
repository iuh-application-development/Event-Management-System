import axios from "axios";
import { useEffect, useState, useContext } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AiFillCalendar } from "react-icons/ai";
import { MdLocationPin } from "react-icons/md";
import { FaCopy, FaWhatsappSquare, FaFacebook } from "react-icons/fa";
import { UserContext } from "../UserContext";

export default function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Fetch event data
  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    // Thêm token nếu cần thiết
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    axios.get(`/event/${id}`)
      .then(response => {
        console.log("Event data received:", response.data);
        setEvent(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching event:", error);
        setLoading(false);
      });
  }, [id]);

  const handleDeleteEvent = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sự kiện này không?")) {
      try {
        await axios.delete(`/event/${id}`);
        alert("Sự kiện đã được xóa thành công");
        navigate("/");
      } catch (error) {
        console.error("Lỗi khi xóa sự kiện:", error);
        alert("Xóa sự kiện thất bại: " + error.response?.data?.error || error.message);
      }
    }
  };

  // Add sharing functionality
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Đã sao chép liên kết vào clipboard!");
  };

  const handleWhatsAppShare = () => {
    const text = `Tham gia sự kiện "${event.title}" với tôi: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`);
  };

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h2 className="text-2xl font-bold text-red-500">Không tìm thấy sự kiện!</h2>
      <p className="mt-2">Sự kiện không tồn tại hoặc đã bị xóa</p>
      <button 
        onClick={() => navigate('/')}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Quay về trang chủ
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hiển thị thông tin sự kiện */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">        {event.image && (
          <img 
            src={`/api/uploads/${event.image}`} 
            alt={event.title} 
            className="w-full h-64 object-cover object-center"
          />
        )}
        
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold text-gray-800">{event.title}</h1>
            {/* Hiển thị trạng thái phê duyệt */}
            {event.isApproved ? (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Đã duyệt</span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Chờ duyệt</span>
            )}
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600"><span className="font-semibold">Tổ chức bởi:</span> {event.organizedBy}</p>
              <p className="text-gray-600">
                <span className="font-semibold">Ngày:</span> {new Date(event.eventDate).toLocaleDateString('vi-VN')}
              </p>
              <p className="text-gray-600"><span className="font-semibold">Giờ:</span> {event.eventTime}</p>
              <p className="text-gray-600"><span className="font-semibold">Địa điểm:</span> {event.location}</p>
              <p className="text-gray-600"><span className="font-semibold">Loại sự kiện:</span> {event.eventType}</p>
            </div>
            <div>
              <p className="text-gray-600"><span className="font-semibold">Giá vé:</span> {event.ticketPrice.toLocaleString('vi-VN')} VNĐ</p>
              <p className="text-gray-600"><span className="font-semibold">Số lượng:</span> {event.Quantity || 'Không giới hạn'}</p>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-800">Mô tả</h3>
            <div className="mt-2 text-gray-600 whitespace-pre-wrap">{event.description}</div>
          </div>
          
          <div className="mt-8 flex flex-wrap gap-3">
            {/* Nút đặt vé - chỉ hiển thị khi sự kiện đã được phê duyệt */}
            {event.isApproved && (
              <button 
                onClick={() => navigate(`/event/${event._id}/ordersummary`)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Đặt vé
              </button>
            )}
            
            {/* Nút sửa/xóa - chỉ hiển thị cho chủ sự kiện hoặc admin */}
            {user && (user._id === (event.owner?._id || event.owner) || user.role === 'admin' || user.role === 'organizer') && (
              <>
                <button 
                  onClick={() => navigate(`/account/events/${event._id}/edit`)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                >
                  Sửa sự kiện
                </button>
                <button 
                  onClick={handleDeleteEvent}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                >
                  Xóa sự kiện
                </button>
              </>
            )}
          </div>

          {/* Phần chia sẻ */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-800">Chia sẻ sự kiện này</h3>
            <div className="mt-2 flex gap-4">
              <button onClick={handleCopyLink}>
                <FaCopy className="w-auto h-6" />
              </button>
              <button onClick={handleWhatsAppShare}>
                <FaWhatsappSquare className="w-auto h-6" />
              </button>
              <button onClick={handleFacebookShare}>
                <FaFacebook className="w-auto h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}