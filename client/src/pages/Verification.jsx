import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useFirebaseAuth } from "../FirebaseAuthContext";
import axios from "axios";
import QrScanner from 'react-qr-scanner';

export default function Verification() {
  const { user, ready } = useFirebaseAuth();
  const [ticketId, setTicketId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingCamera, setUsingCamera] = useState(false);
  const [qrError, setQrError] = useState('');

  // Kiểm tra quyền truy cập - chỉ cho admin và organizer
  useEffect(() => {
    if (ready && user && user.role !== 'admin' && user.role !== 'organizer') {
      setError('Bạn không có quyền truy cập trang này');
    }
  }, [ready, user]);

  // Xử lý khi quét được mã QR
  const handleQrScan = (data) => {
    if (data) {
      try {
        // Có thể data là một JSON string hoặc chỉ là mã vé đơn giản
        let ticketData;
        try {
          // Thử parse dữ liệu là JSON
          ticketData = JSON.parse(data.text);
          console.log("Parsed QR data:", ticketData);
          
          // Nếu parse thành công, gửi ticketId từ object
          const id = ticketData.ticketId;
          if (id) {
            setTicketId(id);
            verifyTicket(id);
          }
        } catch (e) {
          // Nếu không phải JSON, sử dụng trực tiếp data như là ticketId
          console.log("Using raw QR data as ticketId:", data.text);
          setTicketId(data.text);
          verifyTicket(data.text);
        }
        setUsingCamera(false);
      } catch (error) {
        console.error("Lỗi khi xử lý QR code:", error);
        setQrError("Định dạng QR code không hợp lệ");
      }
    }
  };

  // Xử lý lỗi camera
  const handleQrError = (err) => {
    console.error("Camera error:", err);
    setQrError('Không thể truy cập camera: ' + err.message);
  };

  // Hàm xác thực vé
  const verifyTicket = async (id = null) => {
    const ticketToVerify = id || ticketId;
    if (!ticketToVerify.trim()) {
      setError("Vui lòng nhập mã vé");
      return;
    }
    
    setLoading(true);
    setError(''); // Xóa lỗi cũ
    
    try {
      // Đảm bảo token được gửi cùng request
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`Đang gửi yêu cầu xác thực mã vé: ${ticketToVerify}`);
      
      // Gửi request tới API
      const response = await axios.post("/verify-ticket", { 
        ticketId: ticketToVerify 
      });
      
      console.log("Phản hồi từ server:", response.data);
      
      // Cập nhật kết quả xác thực
      setVerificationResult({
        valid: response.data.valid,
        message: response.data.message,
        ticket: response.data.ticket
      });
    } catch (err) {
      console.error("Lỗi khi xác thực vé:", err);
      
      setVerificationResult({
        valid: false,
        message: err.response?.data?.message || 'Không thể xác thực vé',
        error: err.response?.data?.error || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra quyền truy cập
  if (ready && !user) {
    return <Navigate to="/login" />;
  }

  if (ready && user && user.role !== 'admin' && user.role !== 'organizer') {
    return (
      <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Bạn không có quyền truy cập trang này. Chỉ Admin và Organizer mới có thể xác thực vé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
      <h1 className="text-3xl font-bold mb-6">Xác thực vé</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            type="text"
            placeholder="Nhập mã vé"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button 
            onClick={() => verifyTicket()}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primarydark focus:outline-none"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực'}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setUsingCamera(!usingCamera)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
          >
            {usingCamera ? 'Tắt camera' : 'Quét QR code'}
          </button>
        </div>

        {usingCamera && (
          <div className="mt-4">
            <div className="max-w-md mx-auto border-4 border-gray-300 rounded-xl overflow-hidden">
              <QrScanner
                delay={300}
                onError={handleQrError}
                onScan={handleQrScan}
                style={{ width: '100%' }}
                constraints={{
                  video: { facingMode: "environment" }
                }}
              />
            </div>
            {qrError && <p className="text-red-500 mt-2">{qrError}</p>}
            <p className="text-sm text-gray-500 mt-2">
              Đưa mã QR vào khung để quét. Đảm bảo mã QR nằm trong vùng quét và đủ sáng.
            </p>
          </div>
        )}
      </div>

      {verificationResult && (
        <div className={`p-6 rounded-lg shadow-md mb-6 ${verificationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <h2 className="text-xl font-semibold mb-4">Kết quả xác thực</h2>
          
          <div className={`text-xl font-bold mb-4 ${verificationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
            {verificationResult.message}
          </div>
          
          {verificationResult.ticket && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="font-medium mb-2">Thông tin vé:</h3>
                <div className="space-y-1">
                  <p><span className="font-medium">Sự kiện:</span> {verificationResult.ticket.ticketDetails.eventname}</p>
                  <p><span className="font-medium">Ngày:</span> {new Date(verificationResult.ticket.ticketDetails.eventdate).toLocaleDateString('vi-VN')}</p>
                  <p><span className="font-medium">Giờ:</span> {verificationResult.ticket.ticketDetails.eventtime}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Thông tin người mua:</h3>
                <div className="space-y-1">
                  <p><span className="font-medium">Tên:</span> {verificationResult.ticket.ticketDetails.name}</p>
                  <p><span className="font-medium">Email:</span> {verificationResult.ticket.ticketDetails.email}</p>
                  <p><span className="font-medium">Số điện thoại:</span> {verificationResult.ticket.ticketDetails.contactNo}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}