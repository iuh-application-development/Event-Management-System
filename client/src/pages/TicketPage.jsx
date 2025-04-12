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
    if (user && user._id) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Đảm bảo token Firebase được thêm vào header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log("Fetching tickets for user:", user._id);
      const response = await axios.get(`/tickets/user/${user._id}`);
      console.log("Tickets received:", response.data);
      setUserTickets(response.data);
    } catch (err) {
      console.error('Error fetching user tickets:', err);
      setError("Không thể tải danh sách vé: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteTicket = async (ticketId) => {
    try {
      // Đảm bảo token Firebase được thêm vào header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      await axios.delete(`/tickets/${ticketId}`);
      fetchTickets();
      alert('Ticket Deleted');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert("Không thể xóa vé: " + error.message);
    }
  };

  return (
    <div className="flex flex-col flex-grow">
      <div className="mb-5 flex justify-between place-items-center">
        <div>
          <Link to='/'>
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
              rounded-md'
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
      </div>
      
      {/* Debug panel */}
      <div className="mx-12 mb-4 p-2 bg-gray-50 text-xs rounded border border-gray-200">
        <p>User ID: {user?._id || 'Không có'}</p>
        <p>Token: {localStorage.getItem('firebaseToken') ? 'Có' : 'Không có'}</p>
        <p>Số lượng vé: {userTickets.length}</p>
        <button 
          onClick={fetchTickets} 
          className="mt-1 bg-blue-500 text-white px-2 py-1 rounded text-xs"
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Tải lại vé'}
        </button>
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="mx-12 p-4 bg-blue-50 rounded-md">
          <p className="text-blue-700">Đang tải vé...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="mx-12 p-4 bg-red-50 rounded-md border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* No tickets state */}
      {!loading && !error && userTickets.length === 0 && (
        <div className="mx-12 p-4 bg-gray-50 rounded-md">
          <p>Bạn chưa có vé nào.</p>
        </div>
      )}
      
      {/* Tickets list */}
      {!loading && userTickets.length > 0 && (
        <div className="mx-12 grid grid-cols-1 xl:grid-cols-2 gap-5">
          {userTickets.map(ticket => (
            <div key={ticket._id} >
              <div className="">
                <div className="h-48 mt-2 gap-2 p-5 bg-gray-100 font-bold rounded-md relative">
                  <button onClick={() => deleteTicket(ticket._id)} className="absolute cursor-pointer right-0 mr-2">
                    <RiDeleteBinLine className="h-6 w-10 text-red-700" />
                  </button>
                  <div className="flex justify-start place-items-center text-sm md:text-base font-normal">
                    <div className="h-148 w-148">
                      <img src={ticket.ticketDetails.qr} alt="QRCode" className="aspect-square object-fill" />
                    </div>
                    <div className="ml-6 grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="">
                        Event Name : <br /><span className="font-extrabold text-primarydark">{ticket.ticketDetails.eventname.toUpperCase()}</span>
                      </div>
                      <div>
                        Date & Time:<br /> <span className="font-extrabold text-primarydark">{ticket.ticketDetails.eventdate.toUpperCase().split("T")[0]}, {ticket.ticketDetails.eventtime}</span>
                      </div>
                      <div>
                        Name: <span className="font-extrabold text-primarydark">{ticket.ticketDetails.name.toUpperCase()}</span>
                      </div>
                      <div>
                        Price: <span className="font-extrabold text-primarydark">{ticket.ticketDetails.ticketprice.toLocaleString()} VND</span>
                      </div>
                      <div>
                        Email: <span className="font-extrabold text-primarydark">{ticket.ticketDetails.email}</span>
                      </div>
                      <div>
                        Ticket ID: <span className="font-extrabold text-primarydark">{ticket.ticketId || "Chưa cấp"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}