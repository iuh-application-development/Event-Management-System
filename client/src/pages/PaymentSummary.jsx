import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../UserContext";
import axios from "axios";
import QRCode from "qrcode";
import { useFirebaseAuth } from "../FirebaseAuthContext";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentForm from '../components/StripePaymentForm';

const stripePromise = loadStripe('pk_test_51RLmmePwKhP5Ycw1yjadvnhQ0x6VZAAa1COAZPFhfsTWRArqgsyutNl9wkaIoBHwzdicECW5eGCewKAsRFFpI1U300jPV51UsV');
export default function PaymentSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({
    name: '',
    email: '',
    contactNo: ''
  });
  const [phoneError, setPhoneError] = useState('');
  const [userCode, setUserCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStep, setVerificationStep] = useState('form');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const token = localStorage.getItem('firebaseToken');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axios.get(`/event/${id}/ordersummary/paymentsummary`);
        
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
  
  // Handle successful payment
  const handlePaymentSuccess = async (paymentResult) => {
    try {
      setPaymentCompleted(true);
      
      const newTicket = paymentResult.ticket;
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
      console.error("Error processing successful payment:", error);
      alert("Payment completed but there was an error processing your ticket. Please contact support.");
    }
  };
  
  // Prepare ticket data for Stripe form
  const prepareTicketData = () => {
    if (!user || !event) return null;
    
    return {
      userid: user._id,
      eventId: event._id,
      ticketId: `TIX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      ticketDetails: {
        name: details.name,
        email: details.email,
        contactNo: details.contactNo,
        eventname: event.title,
        eventdate: event.eventDate,
        eventtime: event.eventTime,
        ticketprice: event.ticketPrice,
        qr: '' // Will be added after payment
      }
    };
  };

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="ml-3">Loading payment details...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h2 className="text-2xl font-bold text-red-500">Error loading payment page!</h2>
      <p className="mt-2">{error}</p>
      <button 
        onClick={() => navigate('/')}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Return to Home
      </button>
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h2 className="text-2xl font-bold text-red-500">Event not found!</h2>
      <p className="mt-2">The event doesn't exist or has been deleted</p>
      <button 
        onClick={() => navigate('/')}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Return to Home
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Complete Your Purchase</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <div className="bg-white p-6 rounded-lg shadow-md">
            {verificationStep !== 'complete' ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Buyer Information</h2>
                <div className="space-y-4">
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
                </div>
                
                <div className="mt-6 text-center">
                  <button
                    type="button" 
                    onClick={() => setVerificationStep('complete')} 
                    className="inline-block bg-blue-500 text-white px-4 py-2 rounded-md"
                    disabled={verificationStep !== 'verify'}
                  >
                    Proceed to Payment
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
                  {!paymentCompleted && verificationStep === 'complete' && (
                  <Elements stripe={stripePromise} key="payment-form">
                    <StripePaymentForm 
                      amount={event.ticketPrice}
                      eventId={event._id}
                      eventName={event.title}
                      onSuccess={handlePaymentSuccess}
                      ticketDetails={prepareTicketData()}
                    />
                  </Elements>
                )}
                
                {paymentCompleted && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Payment successful! Redirecting to your tickets...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}