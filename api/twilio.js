require('dotenv').config();

const twilio = require('twilio');

// Kiểm tra biến môi trường
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

// Kiểm tra thông tin Twilio
if (!accountSid || !authToken || !twilioPhone) {
  console.error("ERROR: Twilio credentials missing in .env file");
  console.error("Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER");
  throw new Error("Twilio credentials missing. Check .env file");
}

// Khởi tạo Twilio client
const twilioClient = twilio(accountSid, authToken);
console.log("Twilio client initialized successfully");

// Hàm gửi SMS
const sendSMS = async (to, body) => {
  try {
    console.log(`Sending SMS to ${to} from ${twilioPhone}`);
    
    // Gửi SMS thật qua Twilio
    const message = await twilioClient.messages.create({
      body: body,
      from: twilioPhone,
      to: to
    });
    
    console.log(`SMS sent successfully with SID: ${message.sid}`);
    return {
      sid: message.sid,
      status: message.status,
      success: true
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      status: 'error',
      error: error.message,
      success: false
    };
  }
};

module.exports = {
  sendSMS
};