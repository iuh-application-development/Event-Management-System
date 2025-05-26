const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const admin = require('./firebaseAdmin');
const { v4: uuidv4 } = require('uuid');
const { sendSMS } = require('./twilio'); // Added Twilio import
const stripeService = require('./stripeService'); // Added Stripe service import

// Import models
const Event = require('./models/Event');  
const UserModel = require('./models/User');
const Ticket = require('./models/Ticket');

require('dotenv').config();
const app = express();
// Log để kiểm tra biến môi trường
console.log("TWILIO_ACCOUNT_SID exists:", !!process.env.TWILIO_ACCOUNT_SID);
console.log("TWILIO_AUTH_TOKEN exists:", !!process.env.TWILIO_AUTH_TOKEN);
// Middleware
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
   credentials: true,
   origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost', 'http://localhost:80']
}));

// Configure express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'event-management-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 30 * 60 * 1000 // Session timeout: 30 minutes
  }
}));

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
   fs.mkdirSync(uploadsPath, { recursive: true });
}

// Kết nối MongoDB
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/event-management';
mongoose.connect(mongoUrl, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
   socketTimeoutMS: 45000, // Socket timeout
   connectTimeoutMS: 30000, // Connection timeout
})
.then(() => {
   console.log('Đã kết nối với MongoDB');
   // Only create admin after successful connection
   createDefaultAdmin();
})
.catch(err => {
   console.error('Lỗi kết nối MongoDB:', err);
   // You may want to exit the process if DB connection fails
   // process.exit(1);
});

// Models
// UserModel is already imported from './models/User'

// Tạo tài khoản admin mặc định
const createDefaultAdmin = async () => {
   try {
     // Kiểm tra xem tài khoản admin đã tồn tại chưa
     const adminExists = await UserModel.findOne({ email: "admin@eventems.com" });
     let firebaseUid = null;
     
     // Tìm hoặc tạo tài khoản trong Firebase Auth
     try {
       const userRecord = await admin.auth().getUserByEmail("admin@eventems.com");
       firebaseUid = userRecord.uid;
     } catch (firebaseError) {
       // Nếu không tìm thấy trong Firebase, tạo mới
       if (firebaseError.code === 'auth/user-not-found') {
         try {
           const userRecord = await admin.auth().createUser({
             email: "admin@eventems.com",
             password: "admin123",
             displayName: "Administrator"
           });
           firebaseUid = userRecord.uid;
           console.log("Đã tạo tài khoản admin trong Firebase Auth:", userRecord.uid);
         } catch (createError) {
           console.error("Lỗi khi tạo tài khoản admin trong Firebase:", createError);
         }
       }
     }
     
     // Tạo hoặc cập nhật trong MongoDB
     if (!adminExists && firebaseUid) {
       await UserModel.create({
         uid: firebaseUid, // Thêm uid từ Firebase
         name: "Administrator",
         email: "admin@eventems.com",
         password: bcrypt.hashSync("admin123", bcryptSalt),
         role: "admin"
       });
       console.log("Tài khoản admin mặc định đã được tạo!");
     } else if (adminExists && firebaseUid && !adminExists.uid) {
       // Cập nhật uid nếu tài khoản đã tồn tại nhưng chưa có uid
       adminExists.uid = firebaseUid;
       await adminExists.save();
       console.log("Đã cập nhật uid cho tài khoản admin hiện có");
     }
     
     console.log("Email: admin@eventems.com");
     console.log("Mật khẩu: admin123");
   } catch (error) {
     console.error("Lỗi khi tạo tài khoản admin mặc định:", error);
   }
};
 
// Gọi hàm tạo admin mặc định
createDefaultAdmin();

// Cấu hình storage cho multer
const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, uploadsPath);
   },
   filename: (req, file, cb) => {
      // Đổi tên file để tránh trùng lặp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
   },
});

const upload = multer({ storage });

// Middleware để kiểm tra đăng nhập 
const authenticateUser = (req, res, next) => {
   const { token } = req.cookies;
   if (!token) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
   }
   
   jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) {
         return res.status(401).json({ error: 'Token không hợp lệ' });
      }
      
      // Tìm thông tin người dùng từ cơ sở dữ liệu
      try {
         const userDoc = await UserModel.findById(userData.id);
         if (!userDoc) {
            return res.status(401).json({ error: 'Người dùng không tồn tại' });
         }
         
         // Lưu thông tin người dùng vào request để sử dụng trong các middleware và route tiếp theo
         req.user = userDoc;
         next();
      } catch (error) {
         console.error('Lỗi khi tìm thông tin người dùng:', error);
         return res.status(500).json({ error: 'Lỗi server' });
      }
   });
};

// Middleware kiểm tra quyền Admin
const isAdmin = (req, res, next) => {
   if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng' });
   }
   
   if (req.user.role === 'admin') {
      next(); // Cho phép tiếp tục nếu là admin
   } else {
      res.status(403).json({ error: 'Bạn cần quyền quản trị viên để thực hiện hành động này' });
   }
};

// Middleware kiểm tra quyền Organizer hoặc Admin
const isOrganizerOrAdmin = (req, res, next) => {
   if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng' });
   }
   
   if (req.user.role === 'organizer' || req.user.role === 'admin') {
      next(); // Cho phép tiếp tục nếu là organizer hoặc admin
   } else {
      // Thông báo chi tiết hơn dựa vào vai trò
      const message = req.user.role === 'participant'
         ? 'Bạn không có quyền tạo sự kiện. Chỉ Organizer và Admin mới có thể tạo sự kiện.'
         : 'Bạn cần quyền người tổ chức để thực hiện hành động này';
         
      res.status(403).json({ 
         error: message,
         role: req.user.role
      });
   }
};

// Middleware xác thực Firebase token
const authenticateFirebaseToken = async (req, res, next) => {
   // Kiểm tra header Authorization
   const authHeader = req.headers.authorization; // Lấy token từ header Authorization
   if (!authHeader || !authHeader.startsWith('Bearer ')) { // Kiểm tra xem có token không
     return res.status(401).json({ error: 'Chưa đăng nhập' });
   }
   
   // Lấy token từ header
   const token = authHeader.split('Bearer ')[1];
   
   try {
     // Xác thực token với Firebase Admin SDK
     const decodedToken = await admin.auth().verifyIdToken(token);
     
     // Tìm thông tin người dùng trong MongoDB
     let userDoc = await UserModel.findOne({ uid: decodedToken.uid });
     
     // Nếu không tìm thấy, có thể đây là lần đăng nhập đầu tiên với Firebase
     if (!userDoc) {
       // Tạo người dùng mới trong MongoDB với thông tin từ Firebase
       userDoc = await UserModel.create({
         uid: decodedToken.uid,
         name: decodedToken.name || 'User',
         email: decodedToken.email,
         role: 'participant' // Mặc định là participant
       });
     }
     
     // Lưu thông tin người dùng vào request
     req.user = userDoc;
     next();
   } catch (error) {
     console.error('Lỗi xác thực Firebase token:', error);
     return res.status(401).json({ error: 'Token không hợp lệ', details: error.message });
   }
};

// Ticket and Event models are now imported from their respective files

// Middleware kiểm tra quyền sở hữu sự kiện
const isEventOwner = async (req, res, next) => {
   if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng' });
   }
   
   try {
      const eventId = req.params.id;
      const event = await Event.findById(eventId);
      
      if (!event) {
         return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
      }
      
      // Admin có quyền truy cập mọi sự kiện
      // Organizer chỉ có quyền nếu là người tạo sự kiện đó
      if (req.user.role === 'admin' || 
         (event.owner && event.owner.toString() === req.user._id.toString())) {
         req.event = event; // Lưu thông tin sự kiện vào request để sử dụng sau này
         next();
      } else {
         res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này với sự kiện' });
      }
   } catch (error) {
      console.error('Lỗi khi kiểm tra quyền sở hữu sự kiện:', error);
      res.status(500).json({ error: 'Lỗi server' });
   }
};

// ===== ROUTES =====

app.get("/test", (req, res) => {
   res.json("test ok");
});

// Thêm route cho đường dẫn gốc
app.get("/", (req, res) => {
   res.json({
      status: 'API đang hoạt động',
      message: 'Chào mừng đến với API của Hệ thống Quản lý Sự kiện!'
   });
});

// API công khai để lấy danh sách tất cả sự kiện đã được phê duyệt
app.get("/public/events", async (req, res) => {
   try {
      const events = await Event.find({ isApproved: true })
         .sort({ createdAt: -1 });
      
      res.json(events);
   } catch (error) {
      console.error("Lỗi khi lấy danh sách sự kiện:", error);
      res.status(500).json({ error: "Không thể lấy danh sách sự kiện" });
   }
});

app.post("/register", async (req, res) => {
   const { name, email, password, role } = req.body;

   try {
      const userDoc = await UserModel.create({
         name,
         email,
         password: bcrypt.hashSync(password, bcryptSalt),
         role: role || 'participant', // Mặc định là participant nếu không chỉ định
      });
      res.json(userDoc);
   } catch (e) {
      res.status(422).json(e);
   }
});

// Route kiểm tra thông tin profile từ token Firebase
app.get("/profile", authenticateFirebaseToken, async (req, res) => {
   // Đã có thông tin người dùng từ middleware
   res.json(req.user);
});

// Route tạo sự kiện mới với quyền kiểm tra
app.post('/createEvent', authenticateFirebaseToken, isOrganizerOrAdmin, upload.single('image'), async (req, res) => {
   try {
      const { title, organizedBy, eventDate, eventTime, location, eventType, description, ticketPrice, Quantity } = req.body;
      
      // Đường dẫn ảnh nếu có
      const image = req.file ? `/uploads/${req.file.filename}` : null;
      
      // Kiểm tra sự kiện có được tự động phê duyệt không (admin tạo = tự động phê duyệt)
      const isApproved = req.user.role === 'admin';
      
      // Kiểm tra dữ liệu bắt buộc
      const newEvent = await Event.create({
         title,
         organizedBy,
         owner: req.user._id, 
         organizer: req.user._id,
         eventDate,
         eventTime,
         location,
         eventType,
         description,
         ticketPrice,
         Quantity,
         image,
         likes: 0,
         isApproved
      });
      
      res.json(newEvent);
   } catch (error) {
      console.error("Lỗi khi tạo sự kiện:", error);
      res.status(500).json({ error: "Không thể tạo sự kiện", details: error.message });
   }
});

// Route lấy danh sách sự kiện với phân quyền
app.get("/events", authenticateFirebaseToken, async (req, res) => {
   try {
     let events;
     
     // Nếu là admin, lấy tất cả sự kiện
     if (req.user.role === 'admin') {
       events = await Event.find()
         .populate('owner', 'name')
         .sort({ eventDate: -1 });
     } else {
       events = await Event.find({ isApproved: true })
         .populate('owner', 'name')
         .sort({ eventDate: -1 });
     }
     
     res.json(events);
   } catch (error) {
     console.error("Lỗi khi lấy sự kiện:", error);
     res.status(500).json({ error: "Không thể lấy danh sách sự kiện" });
   }
});

app.get("/event/:id/ordersummary/paymentsummary", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      if (!event) {
         return res.status(404).json({ error: "Không tìm thấy sự kiện" });
      }
      
      // Kiểm tra nếu sự kiện chưa được phê duyệt
      if (!event.isApproved) {
         return res.status(403).json({ error: "Sự kiện này chưa được phê duyệt" });
      }
      
      res.json(event);
   } catch (error) {
      console.error("Lỗi khi lấy thông tin sự kiện:", error);
      res.status(500).json({ error: "Không thể lấy thông tin sự kiện từ cơ sở dữ liệu" });
   }
});

app.post("/tickets", async (req, res) => {
   try {
      const ticketDetails = req.body;
      
      // Kiểm tra dữ liệu bắt buộc
      if (!ticketDetails.userid || !ticketDetails.eventId || 
          !ticketDetails.ticketDetails?.name || !ticketDetails.ticketDetails?.email) {
        return res.status(400).json({ 
          error: "Dữ liệu không hợp lệ", 
          details: "Thiếu thông tin bắt buộc để tạo vé" 
        });
      }
      
      const ticketId = uuidv4(); // Tạo ticketId duy nhất
      
      // Kiểm tra số điện thoại trước khi gửi SMS
      const contactNo = ticketDetails.ticketDetails?.contactNo;
      if (!contactNo) {
        return res.status(400).json({
          error: "Thiếu số điện thoại",
          details: "Số điện thoại là bắt buộc để gửi thông báo SMS"
        });
      }
      
      // Định dạng số điện thoại
      const phoneNumber = contactNo.startsWith('+') 
        ? contactNo 
        : `+84${contactNo.replace(/^0/, '')}`;
      
      try {
        // Gửi SMS
        const smsResult = await sendSMS(
          phoneNumber,
          `Xin chào ${ticketDetails.ticketDetails.name}, vé của bạn cho sự kiện ${ticketDetails.ticketDetails.eventname} đã được đặt thành công!`
        );
        
        if (smsResult.status === 'error') {
          return res.status(400).json({
            error: "Không thể gửi SMS",
            details: smsResult.error
          });
        }
        
        // SMS gửi thành công, tạo vé
        const newTicket = new Ticket({
          ...ticketDetails,
          ticketId
        });
        
        await newTicket.save();
        
        res.json({ 
          success: true, 
          message: "Tạo vé thành công và đã gửi SMS", 
          ticket: newTicket 
        });
      } catch (smsError) {
        return res.status(500).json({
          error: "Lỗi khi gửi SMS",
          details: smsError.message
        });
      }
   } catch (error) {
      console.error("Lỗi khi tạo vé:", error);
      res.status(500).json({ error: "Không thể tạo vé", details: error.message });
   }
});

// Route update QR code cho vé
app.put("/tickets/:id/update-qr", async (req, res) => {
   try {
      const { id } = req.params;
      const { qr } = req.body;
      
      if (!qr) {
         return res.status(400).json({ error: "QR code không được để trống" });
      }
      
      const updatedTicket = await Ticket.findByIdAndUpdate(
         id,
         { "ticketDetails.qr": qr },
         { new: true }
      );
      
      if (!updatedTicket) {
         return res.status(404).json({ error: "Không tìm thấy vé" });
      }
      
      res.json(updatedTicket);
   } catch (error) {
      console.error("Lỗi khi cập nhật QR code:", error);
      res.status(500).json({ error: "Không thể cập nhật QR code" });
   }
});
// Route gửi SMS xác thực
app.post("/send-verification-sms", async (req, res) => {
   try {
     const { phoneNumber, code, eventName } = req.body;
     
     if (!phoneNumber || !code) {
       return res.status(400).json({ 
         error: "Thiếu thông tin", 
         details: "Số điện thoại và mã xác thực là bắt buộc" 
       });
     }
     
     console.log(`Đang gửi mã xác thực ${code} đến số ${phoneNumber} cho sự kiện ${eventName}`);
     
     // Gửi SMS chứa mã xác thực
     try {
       const smsResult = await sendSMS(
         phoneNumber,
         `[${eventName}] Mã xác thực đặt vé của bạn là: ${code}. Vui lòng nhập mã này để hoàn tất quá trình đặt vé.`
       );
       
       console.log("Kết quả gửi SMS:", smsResult);
       
       // Trả về thành công mà không kèm mã giả lập
       return res.json({
         success: true,
         message: "SMS xác thực đã được gửi thành công"
       });
       
     } catch (smsError) {
       console.error("Lỗi khi gửi SMS xác thực:", smsError);
       
       // Trả về lỗi thay vì giả lập
       return res.status(500).json({
         error: "Không thể gửi SMS xác thực",
         details: smsError.message 
       });
     }
   } catch (error) {
     console.error("Lỗi khi xử lý yêu cầu:", error);
     res.status(500).json({ error: "Không thể gửi SMS xác thực", details: error.message });
   }
});
// Route kiểm tra vé
// Thêm route xác thực vé sau các route khác và trước app.listen
app.post("/verify-ticket", async (req, res) => {
  try {
    const { ticketId } = req.body;
    
    console.log("Đang xác thực vé với mã:", ticketId);
    
    if (!ticketId) {
      console.log("Lỗi: Không có mã vé được cung cấp");
      return res.status(400).json({ 
        valid: false, 
        message: "Vui lòng cung cấp mã vé để xác thực" 
      });
    }
    
    // Tìm vé theo mã
    const ticket = await Ticket.findOne({ ticketId: ticketId });
    console.log("Kết quả tìm kiếm vé:", ticket ? "Tìm thấy" : "Không tìm thấy");
    
    if (!ticket) {
      return res.status(404).json({ 
        valid: false, 
        message: "Vé không hợp lệ hoặc không tồn tại" 
      });
    }
    
    // Kiểm tra xem vé đã được sử dụng chưa
    if (ticket.checkedIn) {
      console.log(`Vé đã được sử dụng vào: ${ticket.checkedInTime}`);
      return res.json({
        valid: false,
        message: `Vé đã được sử dụng vào lúc ${new Date(ticket.checkedInTime).toLocaleString('vi-VN')}`,
        ticket
      });
    }
    
    // Đánh dấu vé đã được sử dụng
    ticket.checkedIn = true;
    ticket.checkedInTime = new Date();
    await ticket.save();
    console.log("Xác thực vé thành công, đã cập nhật trạng thái");
    
    res.json({
      valid: true,
      message: "Vé hợp lệ! Xác thực thành công.",
      ticket
    });
  } catch (error) {
    console.error("Lỗi khi xác minh vé:", error);
    res.status(500).json({ 
      valid: false,
      message: "Không thể xác minh vé: " + error.message
    });
  }
});
// Thêm middleware xác thực vào route lấy chi tiết sự kiện
app.get("/event/:id", async (req, res) => {
   try {
     const { id } = req.params;
     
     // Kiểm tra định dạng ID hợp lệ
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: "ID sự kiện không hợp lệ" });
     }
     
     const event = await Event.findById(id).populate('owner', 'name');
     
     if (!event) {
       return res.status(404).json({ error: "Không tìm thấy sự kiện" });
     }
     
     res.json(event);
   } catch (error) {
     console.error("Lỗi khi lấy thông tin sự kiện:", error);
     res.status(500).json({ error: "Lỗi server khi lấy thông tin sự kiện" });
   }
});

// API endpoint cho order summary
app.get("/event/:id/ordersummary", async (req, res) => {
   try {
     const { id } = req.params;
     
     // Kiểm tra định dạng ID hợp lệ
     if (!mongoose.Types.ObjectId.isValid(id)) {
       return res.status(400).json({ error: "ID sự kiện không hợp lệ" });
     }
     
     const event = await Event.findById(id);
     
     if (!event) {
       return res.status(404).json({ error: "Không tìm thấy sự kiện" });
     }
     
     res.json(event);
   } catch (error) {
     console.error("Lỗi khi lấy thông tin order summary:", error);
     res.status(500).json({ error: "Lỗi server khi lấy thông tin order summary" });
   }
});
// Route lấy danh sách vé của người dùng
app.get("/tickets/user/:userId", async (req, res) => {
   try {
     const { userId } = req.params;
     const userTickets = await Ticket.find({ userid: userId })
       .populate('eventId')
       .sort({ _id: -1 });
     
     res.json(userTickets);
   } catch (error) {
     console.error("Error fetching user tickets:", error);
     res.status(500).json({ error: "Failed to fetch user tickets", details: error.message });
   }
 });

app.delete("/tickets/:id", async (req, res) => {
   try {
      const ticketId = req.params.id;
      await Ticket.findByIdAndDelete(ticketId);
      res.status(204).send();
   } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ error: "Failed to delete ticket" });
   }
});

// Sửa route delete event để cho phép admin xóa bất kỳ sự kiện nào
app.delete("/event/:id", authenticateFirebaseToken, async (req, res) => {
   try {
      const eventId = req.params.id;
      const event = await Event.findById(eventId);
      
      if (!event) {
         return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
      }
      
      // Kiểm tra quyền: admin có thể xóa bất kỳ sự kiện nào, organizer chỉ có thể xóa sự kiện mình tạo
      if (req.user.role === 'admin' || 
         (event.owner && event.owner.toString() === req.user._id.toString())) {
         
         await Event.findByIdAndDelete(eventId);
         
         // Xóa các vé liên quan đến sự kiện này
         await Ticket.deleteMany({ eventId: eventId });
         
         res.status(200).json({ message: "Sự kiện đã được xóa thành công" });
      } else {
         res.status(403).json({ error: 'Bạn không có quyền xóa sự kiện này' });
      }
   } catch (error) {
      console.error("Lỗi khi xóa sự kiện:", error);
      res.status(500).json({ error: "Không thể xóa sự kiện" });
   }
});

app.put("/event/:id/approve", authenticateFirebaseToken, isAdmin, async (req, res) => {
   try {
      const eventId = req.params.id;
      const event = await Event.findByIdAndUpdate(
         eventId, 
         { isApproved: true }, 
         { new: true }
      );
      
      if (!event) {
         return res.status(404).json({ error: "Không tìm thấy sự kiện" });
      }
      
      // Gửi SMS thông báo cho chủ sự kiện
      const eventWithOwner = await Event.findById(eventId).populate('owner');
      if (eventWithOwner && eventWithOwner.owner && eventWithOwner.owner.phone) {
        await sendSMS(
          eventWithOwner.owner.phone,
          `Sự kiện "${event.title}" của bạn đã được phê duyệt và hiển thị công khai.`
        );
      }
      
      res.json(event);
   } catch (error) {
      console.error("Lỗi khi phê duyệt sự kiện:", error);
      res.status(500).json({ error: "Không thể phê duyệt sự kiện" });
   }
});

app.get("/users", authenticateFirebaseToken, async (req, res) => {
   try {
      const users = await UserModel.find({}, 'name email role');
      res.json(users);
   } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      res.status(500).json({ error: "Không thể lấy danh sách người dùng" });
   }
});

app.put("/users/:id/role", authenticateFirebaseToken, isAdmin, async (req, res) => {
   try {
      const { role } = req.body;
      const userId = req.params.id;
      
      if (!['admin', 'organizer', 'participant'].includes(role)) {
         return res.status(400).json({ error: "Vai trò không hợp lệ" });
      }
      
      const updatedUser = await UserModel.findByIdAndUpdate(
         userId,
         { role },
         { new: true }
      );
      
      if (!updatedUser) {
         return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }
      
      res.json({ 
         _id: updatedUser._id, 
         name: updatedUser.name, 
         email: updatedUser.email, 
         role: updatedUser.role 
      });
   } catch (error) {
      console.error("Lỗi khi cập nhật vai trò người dùng:", error);
      res.status(500).json({ error: "Không thể cập nhật vai trò người dùng" });
   }
});

app.delete("/users/:id", authenticateFirebaseToken, isAdmin, async (req, res) => {
   try {
      const userId = req.params.id;
      
      // Tìm người dùng cần xóa
      const user = await UserModel.findById(userId);
      if (!user) {
         return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }
      
      // Xóa tất cả sự kiện của người dùng này
      const events = await Event.find({ owner: userId });
      for (const event of events) {
         // Xóa các vé liên quan đến sự kiện
         await Ticket.deleteMany({ eventId: event._id });
      }
      await Event.deleteMany({ owner: userId });
      
      // Xóa tất cả vé của người dùng
      await Ticket.deleteMany({ userid: userId });
      
      // Xóa người dùng
      await UserModel.findByIdAndDelete(userId);
      
      res.json({ message: "Người dùng đã được xóa thành công" });
   } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      res.status(500).json({ error: "Không thể xóa người dùng" });
   }
});

// Thêm endpoint mới để gửi nhắc nhở sự kiện
app.get("/send-event-reminders", async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Tìm sự kiện diễn ra ngày mai
    const upcomingEvents = await Event.find({
      eventDate: {
        $gte: new Date(tomorrow.setHours(0,0,0,0)),
        $lt: new Date(tomorrow.setHours(23,59,59,999))
      },
      isApproved: true
    });
    
    let remindersSent = 0;
    
    // Gửi nhắc nhở cho mỗi người đã đăng ký tham gia
    for (const event of upcomingEvents) {
      const tickets = await Ticket.find({ eventId: event._id })
        .populate('userid', 'phone');
      
      for (const ticket of tickets) {
        if (ticket.ticketDetails && ticket.ticketDetails.contactNo) {
          await sendSMS(
            ticket.ticketDetails.contactNo,
            `Nhắc nhở: Sự kiện "${event.title}" mà bạn đã đăng ký diễn ra vào ngày mai tại ${event.location} lúc ${event.eventTime}.`
          );
          remindersSent++;
        }
      }
    }
    
    res.json({ success: true, remindersSent, eventsCount: upcomingEvents.length });
  } catch (error) {
    console.error("Lỗi khi gửi nhắc nhở sự kiện:", error);
    res.status(500).json({ error: "Không thể gửi nhắc nhở sự kiện" });
  }
});

// Route tạo payment intent
app.post("/create-payment-intent", authenticateFirebaseToken, async (req, res) => {
  try {
    const { amount, eventId, eventName, userId, userEmail, userName } = req.body;
      
    if (!amount || !eventId || !userId) {
      return res.status(400).json({ 
        error: "Dữ liệu không hợp lệ", 
        details: "Thiếu thông tin cần thiết để tạo payment intent" 
      });
    }
    
    // Check if amount is valid
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ 
        error: "Số tiền không hợp lệ", 
        details: "Số tiền phải là số dương" 
      });
    }
    
    console.log("Tạo payment intent với số tiền:", amount);
    
    // Check for existing payment intent in session to avoid duplicates
    if (req.session && req.session.currentPaymentIntentId) {
      console.log("Đã có payment intent trong session:", req.session.currentPaymentIntentId);
      // Could retrieve and return existing intent here
    }
    
    const paymentIntent = await stripeService.createPaymentIntent(amount, {
      eventId,
      eventName,
      userId,
      userEmail,
      userName
    });
    
    // Kiểm tra kết quả từ stripeService
    console.log("Payment intent được tạo:", {
      id: paymentIntent.id,
      clientSecretValid: !!paymentIntent.clientSecret
    });
    
    if (!paymentIntent.clientSecret) {
      throw new Error("Client secret không được tạo đúng cách");
    }
    
    // Store in session if available
    if (req.session) {
      req.session.currentPaymentIntentId = paymentIntent.id;
    }
    
    res.json(paymentIntent);
  } catch (error) {
    console.error("Chi tiết lỗi khi tạo payment intent:", error);
    res.status(500).json({ 
      error: "Không thể tạo payment intent", 
      details: error.message 
    });
  }
});

// Webhook để xử lý các sự kiện từ Stripe
app.post("/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Lỗi webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Xử lý các sự kiện thanh toán
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Lấy thông tin từ metadata
    const { eventId, userId, amountVND } = paymentIntent.metadata;
    
    try {
      // Tạo vé sau khi thanh toán thành công
      // (Code này phụ thuộc vào logic tạo vé hiện tại của bạn)
      
      console.log(`Thanh toán thành công cho sự kiện ${eventId}, người dùng ${userId}, số tiền ${amountVND} VND`);
      
      // Ở đây, bạn có thể gọi hàm tạo vé và gửi thông báo
    } catch (error) {
      console.error("Lỗi khi xử lý thanh toán thành công:", error);
    }
  }

  res.json({received: true});
});

// Endpoint xác nhận thanh toán và tạo vé
app.post("/confirm-payment", authenticateFirebaseToken, async (req, res) => {
  try {
    const { paymentIntentId, ticketDetails } = req.body;
    
    console.log("Xác nhận thanh toán cho paymentIntent:", paymentIntentId);
    console.log("Chi tiết vé:", JSON.stringify(ticketDetails, null, 2));
    
    // Xác minh trạng thái thanh toán
    const isSuccess = await stripeService.confirmPaymentSuccess(paymentIntentId);
    
    if (!isSuccess) {
      return res.status(400).json({ error: "Thanh toán chưa hoàn tất" });
    }
    
    // Tạo mã vé duy nhất
    const ticketId = uuidv4();
    
    // Tạo dữ liệu QR Code
    const qrData = JSON.stringify({
      ticketId: ticketId,
      eventId: ticketDetails.eventId,
      userName: ticketDetails.ticketDetails.name,
      eventName: ticketDetails.ticketDetails.eventname
    });
    
    // Tạo QR code
    const QRCode = require('qrcode');
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    
    // Cập nhật dữ liệu vé với QR code đã được tạo
    const ticketWithQR = {
      ...ticketDetails,
      ticketId,
      checkedIn: false,
    };
    
    // Thêm QR code vào ticket details
    ticketWithQR.ticketDetails.qr = qrCodeDataURL;
    
    // Tạo vé mới với QR code
    const newTicket = new Ticket(ticketWithQR);
    
    await newTicket.save();
    
    // Gửi SMS xác nhận (nếu cần)
    try {
      const phoneNumber = ticketDetails.ticketDetails.contactNo.startsWith('+') 
        ? ticketDetails.ticketDetails.contactNo 
        : `+84${ticketDetails.ticketDetails.contactNo.replace(/^0/, '')}`;
      
      await sendSMS(
        phoneNumber,
        `Cảm ơn bạn đã mua vé cho sự kiện "${ticketDetails.ticketDetails.eventname}". Mã vé của bạn là: ${ticketId}`
      );
    } catch (smsError) {
      console.error("Lỗi khi gửi SMS xác nhận vé:", smsError);
      // Không làm gián đoạn quy trình, chỉ ghi nhật ký lỗi
    }
    
    res.json({ 
      success: true, 
      message: "Thanh toán thành công và vé đã được tạo", 
      ticket: newTicket 
    });
  } catch (error) {
    console.error("Lỗi chi tiết khi xác nhận thanh toán:", error);
    res.status(500).json({ 
      error: "Không thể xác nhận thanh toán", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Thêm route này để test kết nối Stripe
app.get('/test-stripe-connection', async (req, res) => {
  try {
    const testIntent = await stripeService.createPaymentIntent(10000, {
      test: true
    });
    
    res.json({
      success: true,
      testIntent: {
        id: testIntent.id,
        hasClientSecret: !!testIntent.clientSecret,
        // Chỉ hiển thị vài ký tự đầu và cuối để bảo mật
        clientSecretPreview: testIntent.clientSecret ? 
          `${testIntent.clientSecret.substring(0, 10)}...${testIntent.clientSecret.substring(testIntent.clientSecret.length - 10)}` : 
          null
      }
    });
  } catch (error) {
    console.error("Lỗi khi test Stripe:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Đặt port và khởi động server
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "your-secret-key";
const port = process.env.PORT || 4000;

app.listen(port, () => {
   console.log(`Server đang chạy tại http://localhost:${port}`);
});
// Route gửi SMS xác thực
// Route gửi SMS xác thực
app.post("/send-verification-sms", async (req, res) => {
   try {
     const { phoneNumber, code, eventName } = req.body;
     
     if (!phoneNumber || !code) {
       return res.status(400).json({ 
         error: "Thiếu thông tin", 
         details: "Số điện thoại và mã xác thực là bắt buộc" 
       });
     }
     
     console.log(`Đang gửi mã xác thực ${code} đến số ${phoneNumber} cho sự kiện ${eventName}`);
     
     try {
       // Gửi SMS chứa mã xác thực thực tế
       const smsResult = await sendSMS(
         phoneNumber,
         `[${eventName}] Mã xác thực đặt vé của bạn là: ${code}. Vui lòng nhập mã này để hoàn tất quá trình đặt vé.`
       );
       
       // Nếu thành công, trả về response thông báo đã gửi SMS
       res.json({
         success: true,
         message: "SMS xác thực đã được gửi thành công đến điện thoại của bạn",
         sid: smsResult.sid
       });
     } catch (smsError) {
       console.error("Chi tiết lỗi khi gửi SMS:", smsError);
       
       // Thông báo lỗi rõ ràng
       res.status(500).json({
         success: false,
         error: "Không thể gửi SMS xác thực",
         details: smsError.message,
         solution: "Hãy kiểm tra định dạng số điện thoại và cấu hình Twilio"
       });
     }
   } catch (error) {
     console.error("Lỗi khi xử lý yêu cầu:", error);
     res.status(500).json({ error: "Không thể xử lý yêu cầu gửi SMS", details: error.message });
   }
 });