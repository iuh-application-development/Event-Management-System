import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../FirebaseAuthContext"; // Thay đổi import này
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";

export default function CreatEvent() {
  // Sử dụng useFirebaseAuth thay vì useContext(UserContext)
  const { user, ready } = useFirebaseAuth(); 
  const navigate = useNavigate();
  
  // States cho form - giữ lại các trường cần thiết
  const [title, setTitle] = useState("");
  const [organizedBy, setOrganizedBy] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // States cho thông báo và xử lý form
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirect, setRedirect] = useState(false);

  // Kiểm tra quyền truy cập khi component được tải
  useEffect(() => {
    // Đảm bảo token Firebase được thêm vào header
    const token = localStorage.getItem('firebaseToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    if (ready && !user) {
      navigate("/login");
    }
  }, [ready, user, navigate]);

  // Xử lý khi upload ảnh - thêm preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Tạo URL để xem trước ảnh
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Giải phóng URL khi component unmount
      return () => URL.revokeObjectURL(previewUrl);
    }
  };

  // Xử lý khi submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      // Đảm bảo token Firebase được thêm vào header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      // Validate các trường bắt buộc
      if (!title || !organizedBy || !eventDate || !eventTime || !location || !eventType || !description || !ticketPrice || !quantity) {
        throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
      }

      // Tạo FormData để upload cả file và dữ liệu khác
      const formData = new FormData();
      formData.append('title', title);
      formData.append('organizedBy', organizedBy);
      formData.append('eventDate', eventDate);
      formData.append('eventTime', eventTime);
      formData.append('location', location);
      formData.append('eventType', eventType);
      formData.append('description', description);
      formData.append('ticketPrice', ticketPrice);
      formData.append('Quantity', quantity);
      formData.append('likes', 0);
      
      // Nếu có upload hình ảnh
      if (image) {
        formData.append('image', image);
      }
      
      console.log("Đang gửi dữ liệu sự kiện...");
      
      // Gửi request tạo sự kiện
      const { data } = await axios.post('/createEvent', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` // Đảm bảo gửi token
        }
      });
      
      console.log("Kết quả từ server:", data);
      
      // Hiển thị thông báo thành công dựa theo vai trò
      const successMessage = user.role === 'admin' 
        ? "Sự kiện đã được tạo thành công và được phê duyệt tự động" 
        : "Sự kiện đã được tạo thành công và đang chờ phê duyệt từ quản trị viên";
      
      setSuccess(successMessage);
      
      // Chuyển hướng sau 2 giây
      setTimeout(() => {
        setRedirect(true);
      }, 2000);
      
    } catch (err) {
      // Xử lý lỗi
      console.error("Lỗi khi tạo sự kiện:", err);
      
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError(err.message || "Đã xảy ra lỗi khi tạo sự kiện");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kiểm tra quyền truy cập
  if (!ready) {
    return <div className="mx-5 xl:mx-32 md:mx-10 mt-5">Đang tải...</div>;
  }

  if (ready && !user) {
    return <Navigate to={"/login"} />;
  }

  if (ready && user && user.role === 'participant') {
    return (
      <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Bạn không có quyền tạo sự kiện. Chỉ Organizer và Admin mới có thể tạo sự kiện.</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 inline-block border border-blue-500 rounded py-1 px-3 bg-blue-500 text-white"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (redirect) {
    return <Navigate to={'/'} />;
  }

  return (
    <>
      <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
        <h1 className="text-2xl font-bold mb-6">Tạo sự kiện mới</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        <form id="eventForm" onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin cơ bản */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Thông tin cơ bản</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tên sự kiện *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Đơn vị tổ chức *
                </label>
                <input
                  type="text"
                  value={organizedBy}
                  onChange={(e) => setOrganizedBy(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ngày diễn ra *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Giờ bắt đầu *
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Loại sự kiện *
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Chọn loại sự kiện --</option>
                  <option value="Hòa nhạc">Hòa nhạc</option>
                  <option value="Hội nghị">Hội nghị</option>
                  <option value="Thể thao">Thể thao</option>
                  <option value="Giải trí">Giải trí</option>
                  <option value="Giáo dục">Giáo dục</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Địa điểm *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Mô tả sự kiện */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Mô tả sự kiện</h2>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Chi tiết sự kiện *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              ></textarea>
            </div>
          </div>
          
          {/* Thông tin vé */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Thông tin vé</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Giá vé (VND) *
                </label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  min="0"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500">Nhập 0 nếu sự kiện miễn phí</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Số lượng vé *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Hình ảnh */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Hình ảnh sự kiện</h2>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Hình ảnh đại diện
              </label>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                {imagePreview ? (
                  <div className="space-y-1 text-center">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="mx-auto h-64 object-contain" 
                    />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Chọn hình khác</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Tải lên hình ảnh</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImageChange} 
                        />
                      </label>
                      <p className="pl-1">hoặc kéo thả vào đây</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG (tối đa 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Nút submit */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Tạo sự kiện'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}