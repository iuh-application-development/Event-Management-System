import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../UserContext";
import axios from "axios";
import QRCode from "qrcode";
import { useFirebaseAuth } from "../FirebaseAuthContext";

export default function PaymentSummary() {
  const {id} = useParams();
  const { user: contextUser } = useContext(UserContext);
  const { user: firebaseUser } = useFirebaseAuth();
  const navigate = useNavigate();
  
  // Combine user information from both sources
  const user = firebaseUser || contextUser;
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({
    name: '',
    email: '',
    contactNo: ''
  });
  const [payment, setPayment] = useState({
    nameOnCard: '',
    cardNumber: '',
    bank: ''
  });
  const [phoneError, setPhoneError] = useState('');
  const [verificationStep, setVerificationStep] = useState('form'); // 'form', 'verify', 'complete'
  const [verificationCode, setVerificationCode] = useState('');
  const [userCode, setUserCode] = useState('');

  // Debug user information
  useEffect(() => {
    console.log("Firebase User:", firebaseUser);
    console.log("Context User:", contextUser);
    console.log("Combined User:", user);
  }, [firebaseUser, contextUser, user]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn("No Firebase token found");
      }
    };
    checkAuth();
  }, []);

  // Get event information
  useEffect(() => {
    if (!id) return;
    
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('firebaseToken');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        console.log("Fetching event ID:", id);
        const response = await axios.get(`/event/${id}`);
        console.log("Event data:", response.data);
        
        if (!response.data) {
          throw new Error("No event data found");
        }
        
        setEvent(response.data);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err.response?.data?.error || "Could not load event information");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [id]);
  
  // Update user information when available
  useEffect(() => {
    if (user) {
      setDetails(prev => ({
        ...prev,
        name: user.name || user.displayName || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Phone number validation
  const validatePhoneNumber = (phone) => {
    if (!phone) {
      setPhoneError('Phone number is required');
      return false;
    }
    
    // Check Vietnamese phone format
    const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError('Invalid phone number (must be a Vietnamese phone number)');
      return false;
    }
    
    setPhoneError('');
    return true;
  };
  
  // Handle user details changes
  const handleChangeDetails = (e) => {
    const { name, value } = e.target;
    if (name === 'contactNo') {
      validatePhoneNumber(value);
    }
    
    setDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle payment information changes
  const handleChangePayment = (e) => {
    const { name, value } = e.target;
    setPayment(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Send SMS verification
  const sendVerificationSMS = async () => {
    if (!validatePhoneNumber(details.contactNo)) {
      alert("Invalid phone number! Please check again.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Ensure token is in header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Format phone number
      const phoneNumber = details.contactNo.startsWith('+') 
        ? details.contactNo 
        : `+84${details.contactNo.replace(/^0/, '')}`;
      
      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      
      // Send verification SMS
      const response = await axios.post('/send-verification-sms', {
        phoneNumber,
        code,
        eventName: event.title
      });
      
      console.log("Server response:", response.data);

      if (response.data.success) {
        setVerificationStep('verify');
        
        // If we're in simulation mode, show the code
        if (response.data.simulatedCode) {
          alert(`Your verification code is: ${response.data.simulatedCode}`);
        } else {
          alert("Verification code has been sent to your phone.");
        }
      } else {
        throw new Error(response.data.error || "Could not send verification code");
      }
    } catch (error) {
      console.error("SMS error details:", error);
      alert("Could not send verification code: " + (error.response?.data?.details || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Verify code entered by user
  const verifyCode = () => {
    if (userCode === verificationCode) {
      setVerificationStep('complete');
      alert("Verification successful! Please complete ticket purchase.");
    } else {
      alert("Wrong verification code. Please try again.");
    }
  };
  
  // Generate QR code function
  async function generateQRCode(eventName, userName, eventId, ticketId) {
    try {
      // Create data string for QR
      const qrData = JSON.stringify({
        ticketId: ticketId,
        eventId: eventId,
        userName: userName,
        eventName: eventName
      });
      
      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData);
      return qrCodeDataURL;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return "";
    }
  }
  
  // Create ticket function
  const createTicket = async (e) => {
    e.preventDefault();
    
    console.log("User data on submit:", user);
    
    // Ensure user is logged in
    if (!user) {
      alert("Please log in to purchase tickets!");
      navigate('/login');
      return;
    }
    
    // Get user ID from either source
    const userId = user._id || (firebaseUser?.uid ? user._id : null);
    
    if (!userId) {
      console.error("No user ID found:", user);
      alert("User ID not found. Please login again!");
      navigate('/login');
      return;
    }
    
    // Check required fields
    if (!details.name || !details.email || !details.contactNo) {
      alert("Please fill in all buyer information!");
      return;
    }
    
    if (!payment.nameOnCard || !payment.cardNumber || !payment.bank) {
      alert("Please fill in all payment information!");
      return;
    }
    
    // Check SMS verification
    if (verificationStep !== 'complete') {
      alert("Please verify your phone number before purchasing tickets!");
      return;
    }
    
    setLoading(true);
    
    try {
      // Ensure Firebase token is in header
      const token = localStorage.getItem('firebaseToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Prepare ticket data
      const ticketData = {
        userid: userId,
        eventId: id,
        ticketDetails: {
          eventname: event.title,
          eventdate: event.eventDate,
          eventtime: event.eventTime,
          name: details.name,
          email: details.email,
          contactNo: details.contactNo,
          ticketprice: event.ticketPrice,
          paymentInfo: {
            nameOnCard: payment.nameOnCard,
            cardNumber: payment.cardNumber.slice(-4), // Only store last 4 digits
            bank: payment.bank
          },
          qr: "placeholder",
          verifiedPhone: true
        }
      };
      
      console.log("Sending ticket data:", ticketData);
      
      // Send request to create ticket
      const response = await axios.post('/tickets', ticketData);
      
      if (!response.data) {
        throw new Error("No response from server");
      }
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const newTicket = response.data.ticket;
      console.log("Ticket created:", newTicket);
      
      // Generate QR code with ticket data
      const qrCode = await generateQRCode(
        newTicket.ticketDetails.eventname,
        newTicket.ticketDetails.name,
        newTicket.eventId,
        newTicket.ticketId
      );
      
      // Update ticket with QR code
      await axios.put(`/tickets/${newTicket._id}/update-qr`, { qr: qrCode });
      
      alert("Ticket purchased successfully! You can view your tickets in My Tickets section.");
      
      // Use navigate to redirect to /wallet after successful purchase
      navigate("/wallet");
    } catch (error) {
      console.error('Error creating ticket:', error);
      console.error('Response data:', error.response?.data);
      alert("Could not create ticket: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <p className="text-xl font-semibold">Could not load event information</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-5 xl:mx-32 md:mx-10 mt-5">
      <h1 className="text-3xl font-bold mb-6">Event Ticket Purchase</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Event Information */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Event Information</h2>
            <div className="space-y-3">
              <p><span className="font-medium">Event Name:</span> {event.title}</p>
              <p><span className="font-medium">Date:</span> {new Date(event.eventDate).toLocaleDateString('vi-VN')}</p>
              <p><span className="font-medium">Time:</span> {event.eventTime}</p>
              <p><span className="font-medium">Location:</span> {event.location}</p>
              <p><span className="font-medium">Ticket Price:</span> {event.ticketPrice.toLocaleString('vi-VN')} VNĐ</p>
            </div>
          </div>
        </div>
        
        {/* Order Form */}
        <div className="md:col-span-2">
          <form onSubmit={createTicket} className="bg-white p-6 rounded-lg shadow-md">
            {/* Buyer Information */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Buyer Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                  <input 
                    type="text"
                    name="name"
                    value={details.name}
                    onChange={handleChangeDetails}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input 
                    type="email"
                    name="email"
                    value={details.email}
                    onChange={handleChangeDetails}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                  <div className="flex gap-2">
                    <input 
                      type="tel"
                      name="contactNo"
                      value={details.contactNo}
                      onChange={handleChangeDetails}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      placeholder="Enter phone number (start with 0 or +84)"
                      disabled={verificationStep !== 'form'}
                    />
                    
                    {verificationStep === 'form' && (
                      <button 
                        type="button"
                        onClick={sendVerificationSMS}
                        className="mt-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 whitespace-nowrap"
                        disabled={loading || !details.contactNo}
                      >
                        Verify
                      </button>
                    )}
                  </div>
                  {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                </div>
                
                {verificationStep === 'verify' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verification Code *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userCode}
                        onChange={(e) => setUserCode(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter the 6-digit code from SMS"
                        required
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={verifyCode}
                        className="mt-1 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 whitespace-nowrap"
                      >
                        Confirm
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Verification code has been sent to your phone
                    </p>
                  </div>
                )}
                
                {verificationStep === 'complete' && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    <p>Phone number verified successfully</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Payment Information */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name on Card *</label>
                  <input 
                    type="text"
                    name="nameOnCard"
                    value={payment.nameOnCard}
                    onChange={handleChangePayment}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Card Number *</label>
                  <input 
                    type="text"
                    name="cardNumber"
                    value={payment.cardNumber}
                    onChange={handleChangePayment}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name *</label>
                  <input 
                    type="text" 
                    name="bank"
                    value={payment.bank}
                    onChange={handleChangePayment}
                    placeholder="VCB, BIDV, Techcombank,..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Confirm Order */}
            <div className="flex justify-between items-center border-t border-gray-200 pt-4">
              <div>
                <p className="text-lg font-semibold">Total:</p>
                <p className="text-2xl font-bold text-blue-600">{event.ticketPrice.toLocaleString('vi-VN')} VNĐ</p>
              </div>
              
              <button 
                type="submit" 
                className={`${loading || verificationStep !== 'complete' ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white px-6 py-3 rounded-md transition`}
                disabled={loading || verificationStep !== 'complete'}
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Processing...
                  </>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}