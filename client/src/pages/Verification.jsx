import { useState, useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../UserContext';
import QrReader from 'react-qr-scanner';

export default function Verification() {
  const { user, ready } = useContext(UserContext);
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

  const handleQrScan = (data) => {
    if (data) {
      setTicketId(data.text);
      verifyTicket(data.text);
      setUsingCamera(false);
    }
  };

  const handleQrError = (err) => {
    setQrError('Không thể truy cập camera: ' + err);
  };

  const verifyTicket = async (id = null) => {
    const ticketToVerify = id || ticketId;
    if (!ticketToVerify.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/verify-ticket/${ticketToVerify}`);
      setVerificationResult({
        valid: true,
        message: response.data.message,
        ticket: response.data.ticket
      });
    } catch (error) {
      setVerificationResult({
        valid: false,
        message: error.response?.data?.message || 'Không thể xác thực vé',
        ticket: error.response?.data?.ticket
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
              <QrReader
                delay={300}
                onError={handleQrError}
                onScan={handleQrScan}
                style={{ width: '100%' }}
              />
            </div>
            {qrError && <p className="text-red-500 mt-2">{qrError}</p>}
          </div>
        )}
      </div>

      {verificationResult && (
        <div className={`p-6 rounded-lg shadow-sm ${verificationResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
          <h2 className={`text-2xl font-bold mb-4 ${verificationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
            {verificationResult.valid ? 'Vé hợp lệ' : 'Vé không hợp lệ'}
          </h2>
          <p className="text-lg mb-4">{verificationResult.message}</p>
          
          {verificationResult.ticket && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">Thông tin vé:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-medium">Mã vé:</span> {verificationResult.ticket._id}</p>
                  <p><span className="font-medium">Sự kiện:</span> {verificationResult.ticket.eventTitle}</p>
                  <p><span className="font-medium">Người sở hữu:</span> {verificationResult.ticket.userName}</p>
                </div>
                {verificationResult.valid && verificationResult.ticket.eventDate && (
                  <div>
                    <p><span className="font-medium">Ngày:</span> {new Date(verificationResult.ticket.eventDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Giờ:</span> {verificationResult.ticket.eventTime}</p>
                    <p><span className="font-medium">Địa điểm:</span> {verificationResult.ticket.location}</p>
                  </div>
                )}
              </div>
              
              {verificationResult.ticket.usedAt && (
                <p className="mt-4 text-sm text-gray-600">
                  <span className="font-medium">Đã sử dụng lúc:</span> {new Date(verificationResult.ticket.usedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}