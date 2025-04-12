import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../FirebaseAuthContext";
import axios from "axios";
import { Navigate, Link } from "react-router-dom";

export default function AdminPage() {
    const { user, ready } = useFirebaseAuth();
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('users');
    const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && user && user.role === 'admin') {
      // Đảm bảo token Firebase được thêm vào header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      fetchUsers();
      fetchEvents();
    }
  }, [user, ready]);

  // Hàm lấy danh sách người dùng từ API
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      alert("Không thể tải danh sách người dùng: " + error.message);
      setLoading(false);
    }
  };

  // Hàm lấy danh sách sự kiện từ API
  const fetchEvents = async () => {
    try {
      const response = await axios.get('/events');
      setEvents(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sự kiện:", error);
      alert("Không thể tải danh sách sự kiện: " + error.message);
    }
  };

  // Hàm thay đổi vai trò người dùng
  const changeUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
      alert("Vai trò người dùng đã được cập nhật thành công!");
    } catch (error) {
      console.error("Lỗi khi thay đổi vai trò người dùng:", error);
      alert("Không thể thay đổi vai trò người dùng!");
    }
  };
  
  const deleteUser = async (userId, userEmail) => {
    // Không cho phép xóa tài khoản admin mặc định
    if (userEmail === 'admin@eventems.com') {
      alert("Không thể xóa tài khoản admin mặc định!");
      return;
    }
    
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này? Tất cả sự kiện và vé liên quan cũng sẽ bị xóa.")) {
      try {
        await axios.delete(`/users/${userId}`);
        fetchUsers();
        alert("Người dùng đã được xóa thành công!");
      } catch (error) {
        console.error("Lỗi khi xóa người dùng:", error);
        alert("Không thể xóa người dùng: " + (error.response?.data?.error || error.message));
      }
    }
  };

  // Hàm phê duyệt sự kiện
  const approveEvent = async (eventId) => {
    try {
      await axios.put(`/event/${eventId}/approve`);
      fetchEvents();
      alert("Sự kiện đã được phê duyệt thành công!");
    } catch (error) {
      console.error("Lỗi khi phê duyệt sự kiện:", error);
      alert("Không thể phê duyệt sự kiện!");
    }
  };

  // Hàm xóa sự kiện
  const deleteEvent = async (eventId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      try {
        await axios.delete(`/event/${eventId}`);
        fetchEvents();
        alert("Sự kiện đã được xóa thành công!");
      } catch (error) {
        console.error("Lỗi khi xóa sự kiện:", error);
        alert("Không thể xóa sự kiện!");
      }
    }
  };

  // Kiểm tra xem người dùng có phải là admin không
  if (ready && (!user || user.role !== 'admin')) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
      <h1 className="text-3xl font-bold mb-6">Quản lý hệ thống</h1>
      
      {/* Tab navigation */}
      <div className="flex border-b mb-4">
        <button 
          className={`py-2 px-4 font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('users')}
        >
          Người dùng
        </button>
        <button 
          className={`py-2 px-4 font-medium ${activeTab === 'events' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('events')}
        >
          Sự kiện
        </button>
      </div>

      {/* Quản lý người dùng */}
      {activeTab === 'users' && (
        <div className="overflow-auto rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">ID</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Tên</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Email</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Vai trò</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user._id} className="bg-white">
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{user._id}</td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{user.name}</td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{user.email}</td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{user.role}</td>
                  <td className="p-3 text-sm whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <select 
                      defaultValue={user.role}
                      onChange={(e) => changeUserRole(user._id, e.target.value)}
                      className="p-2 border rounded"
                    >
                      <option value="admin">Admin</option>
                      <option value="organizer">Organizer</option>
                      <option value="participant">Participant</option>
                    </select>
                    
                    <button
                      onClick={() => deleteUser(user._id, user.email)}
                      disabled={user.email === 'admin@eventems.com'}
                      className={`py-1 px-2 rounded-md text-xs text-white ${
                        user.email === 'admin@eventems.com' ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quản lý sự kiện */}
      {activeTab === 'events' && (
        <div className="overflow-auto rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">ID</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Tên sự kiện</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Người tạo</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Ngày</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Trạng thái</th>
                <th className="p-3 text-sm font-semibold tracking-wide text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event._id} className="bg-white">
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">{event._id}</td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">
                    <Link to={`/event/${event._id}`} className="text-blue-500 hover:underline">
                      {event.title}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">
                    {event.owner && event.owner.name ? event.owner.name : event.organizedBy || 'Không có'}
                  </td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">
                    {new Date(event.eventDate).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-sm text-gray-700 whitespace-nowrap">
                    {event.isApproved ? (
                      <span className="bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs">Đã duyệt</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full text-xs">Chờ duyệt</span>
                    )}
                  </td>
                  <td className="p-3 text-sm whitespace-nowrap">
                    <div className="flex space-x-2">
                      {!event.isApproved && (
                        <button
                          onClick={() => approveEvent(event._id)}
                          className="bg-green-500 text-white py-1 px-2 rounded-md text-xs hover:bg-green-600"
                        >
                          Duyệt
                        </button>
                      )}
                      <button
                        onClick={() => deleteEvent(event._id)}
                        className="bg-red-500 text-white py-1 px-2 rounded-md text-xs hover:bg-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}