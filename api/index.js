const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const UserModel = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const admin = require('./firebaseAdmin');

// Xác định đường dẫn tuyệt đối cho thư mục uploads
const uploadsPath = path.join(__dirname, 'uploads');

// Đảm bảo thư mục uploads tồn tại
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const Ticket = require("./models/Ticket");
const { generateTicketId } = require('./utils/ticketUtils'); 

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "bsbsfbrnsftentwnnwnwn";

app.use(express.json());
app.use(cookieParser());
app.use(
   cors({
      credentials: true,
      origin: "http://localhost:5173",
   })
);

// Thiết lập middleware phục vụ file tĩnh sớm trong ứng dụng
app.use('/uploads', express.static(uploadsPath));

mongoose.connect(process.env.MONGO_URL);

// Tạo tài khoản admin mặc định nếu chưa tồn tại
const createDefaultAdmin = async () => {
   try {
     // Kiểm tra trong MongoDB
     const adminExists = await UserModel.findOne({ email: "admin@eventems.com" });
     
     let firebaseUid;
     // Kiểm tra trong Firebase Auth
     try {
       const userRecord = await admin.auth().getUserByEmail("admin@eventems.com");
       firebaseUid = userRecord.uid;
       console.log("Tài khoản admin đã tồn tại trong Firebase Auth");
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

// Middleware để kiểm tra đăng nhập - Di chuyển lên trên để định nghĩa trước khi sử dụng
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

// Middleware xác thực Firebase
const authenticateFirebaseToken = async (req, res, next) => {
   // Kiểm tra header Authorization
   const authHeader = req.headers.authorization;
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: 'Chưa đăng nhập' });
   }
   
   // Lấy token từ header
   const token = authHeader.split('Bearer ')[1];
   
   try {
     // Xác thực token với Firebase Admin SDK
     const decodedToken = await admin.auth().verifyIdToken(token);
     
     // Tìm thông tin người dùng trong MongoDB
     let userDoc = await UserModel.findOne({ uid: decodedToken.uid });
     
     // Nếu không tìm thấy người dùng, có thể họ đang đăng nhập lần đầu
     if (!userDoc) {
       return res.status(401).json({ error: 'Người dùng chưa được đăng ký trong hệ thống' });
     }
     
     // Lưu thông tin người dùng vào request
     req.user = userDoc;
     next();
   } catch (error) {
     console.error('Lỗi xác thực Firebase token:', error);
     res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
   }
 };

// Định nghĩa Event schema và model trước khi sử dụng trong middleware
const eventSchema = new mongoose.Schema({
   owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Lưu ID người tạo
   title: String,
   description: String,
   organizedBy: String,
   eventDate: Date,
   eventTime: String,
   location: String,
   Participants: Number,
   Count: Number,
   Income: Number,
   ticketPrice: Number,
   Quantity: Number,
   image: String,
   likes: Number,
   Comment: [String],
   isApproved: { type: Boolean, default: false } // Thêm trường mới
});

const Event = mongoose.model("Event", eventSchema);

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
      message: "EventoEMS API đang chạy",
      endpoints: [
         "/test",
         "/register",
         "/login",
         "/profile",
         "/createEvent",
         "/event/:id"
      ]
   });
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

app.post("/login", async (req, res) => {
   const { email, password } = req.body;

   const userDoc = await UserModel.findOne({ email });

   if (!userDoc) {
      return res.status(404).json({ error: "User not found" });
   }

   const passOk = bcrypt.compareSync(password, userDoc.password);
   if (!passOk) {
      return res.status(401).json({ error: "Invalid password" });
   }

   jwt.sign(
      {
         email: userDoc.email,
         id: userDoc._id,
      },
      jwtSecret,
      {},
      (err, token) => {
         if (err) {
            return res.status(500).json({ error: "Failed to generate token" });
         }
         res.cookie("token", token).json(userDoc);
      }
   );
});

app.get("/profile", authenticateFirebaseToken, (req, res) => {
   // Đã có thông tin user từ middleware authenticateFirebaseToken
   const { _id, name, email, role, photoURL } = req.user;
   res.json({ _id, name, email, role, photoURL });
 });

 app.post("/logout", (req, res) => {
   // Không cần xóa cookie vì Firebase Auth không sử dụng cookie
   res.json({ success: true });
});

// Sửa route createEvent để chỉ lưu tên file, không lưu đường dẫn đầy đủ
app.post("/createEvent", authenticateFirebaseToken, isOrganizerOrAdmin, upload.single("image"), async (req, res) => {
   try {
      const eventData = req.body;
      
      // Chỉ lưu tên file thay vì đường dẫn đầy đủ
      if (req.file) {
         console.log("File uploaded:", req.file);
         eventData.image = path.basename(req.file.path);
      } else {
         eventData.image = "";
      }
      
      // Lưu thông tin người tạo sự kiện
      eventData.owner = req.user._id;
      // Thêm trạng thái phê duyệt (mặc định là false)
      eventData.isApproved = req.user.role === 'admin' ? true : false;
      
      const newEvent = new Event(eventData);
      await newEvent.save();
      
      // Thêm thông báo thành công
      const message = req.user.role === 'admin' 
         ? "Sự kiện đã được tạo thành công và được phê duyệt tự động" 
         : "Sự kiện đã được tạo thành công và đang chờ phê duyệt từ quản trị viên";
      
      res.status(201).json({
         event: newEvent,
         message: message,
         success: true
      });
   } catch (error) {
      console.error("Lỗi khi tạo sự kiện:", error);
      res.status(500).json({ error: "Không thể lưu sự kiện" });
   }
});

app.get("/createEvent", async (req, res) => {
   try {
      const events = await Event.find();
      res.status(200).json(events);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch events from MongoDB" });
   }
});

app.get("/event/:id", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      res.json(event);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch event from MongoDB" });
   }
});

app.post("/event/:eventId", (req, res) => {
   const eventId = req.params.eventId;

   Event.findById(eventId)
      .then((event) => {
         if (!event) {
            return res.status(404).json({ message: "Event not found" });
         }

         event.likes += 1;
         return event.save();
      })
      .then((updatedEvent) => {
         res.json(updatedEvent);
      })
      .catch((error) => {
         console.error("Error liking the event:", error);
         res.status(500).json({ message: "Server error" });
      });
});

// Đảm bảo chỉ có một route "/events" - xóa route thừa và giữ lại route có middleware
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

app.get("/event/:id/ordersummary", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      res.json(event);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch event from MongoDB" });
   }
});

app.get("/event/:id/ordersummary/paymentsummary", async (req, res) => {
   const { id } = req.params;
   try {
      const event = await Event.findById(id);
      res.json(event);
   } catch (error) {
      res.status(500).json({ error: "Failed to fetch event from MongoDB" });
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
      
      // Tạo Ticket ID duy nhất
      const ticketId = generateTicketId(
         ticketDetails.eventId, 
         ticketDetails.userid
      );
      
      // Thêm ticketId vào dữ liệu vé
      const newTicket = new Ticket({
         ...ticketDetails,
         ticketId
      });
      
      await newTicket.save();
      return res.status(201).json({ ticket: newTicket });
   } catch (error) {
      console.error("Error creating ticket:", error.message);
      return res.status(500).json({ error: "Failed to create ticket", details: error.message });
   }
});

app.get("/tickets/:id", async (req, res) => {
   try {
      const tickets = await Ticket.find();
      res.json(tickets);
   } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
   }
});

// Endpoint xác thực vé
app.get("/verify-ticket/:id", authenticateFirebaseToken, async (req, res) => {
   try {
     const searchId = req.params.id;
     let ticket;
     
     // Kiểm tra nếu dữ liệu là JSON từ QR code
     try {
       const qrData = JSON.parse(searchId);
       
       // Ưu tiên tìm theo ticketId nếu có trong QR code
       if (qrData && qrData.ticketId) {
         ticket = await Ticket.findOne({ ticketId: qrData.ticketId })
           .populate('eventId')
           .populate('userid', 'name email');
         
         if (ticket) {
           console.log("Đã tìm thấy vé bằng ticketId từ QR:", qrData.ticketId);
         }
       }
       
       // Nếu không tìm thấy bằng ticketId, thử tìm theo eventId và name
       if (!ticket && qrData && qrData.eventId && qrData.name) {
         ticket = await Ticket.findOne({ 
           eventId: qrData.eventId,
           'ticketDetails.name': new RegExp(qrData.name, 'i')
         })
         .populate('eventId')
         .populate('userid', 'name email');
         
         if (ticket) {
           console.log("Đã tìm thấy vé bằng eventId và name từ QR");
         }
       }
     } catch (e) {
       // Không phải JSON, bỏ qua
       console.log("Dữ liệu không phải JSON:", e.message);
     }
     
     // Nếu vẫn không tìm thấy, tiếp tục tìm bằng các phương thức khác
     if (!ticket && mongoose.Types.ObjectId.isValid(searchId)) {
       ticket = await Ticket.findById(searchId)
         .populate('eventId')
         .populate('userid', 'name email');
       
       if (ticket) {
         console.log("Đã tìm thấy vé bằng ID MongoDB");
       }
     }
     
     // Tìm bằng ticketId như là chuỗi thông thường
     if (!ticket) {
       ticket = await Ticket.findOne({ ticketId: searchId })
         .populate('eventId')
         .populate('userid', 'name email');
       
       if (ticket) {
         console.log("Đã tìm thấy vé bằng ticketId trực tiếp");
       }
     }
     
     if (!ticket) {
       return res.status(404).json({ 
         valid: false, 
         message: "Vé không tồn tại" 
       });
     }
     
     // Kiểm tra xem vé đã được sử dụng chưa
     if (ticket.isUsed) {
       return res.status(400).json({ 
         valid: false, 
         message: "Vé đã được sử dụng", 
         ticket: {
           _id: ticket._id,
           ticketId: ticket.ticketId,
           eventTitle: ticket.ticketDetails.eventname,
           userName: ticket.ticketDetails.name,
           usedAt: ticket.usedAt
         }
       });
     }
     
     // Kiểm tra xem sự kiện đã diễn ra chưa
     const eventDate = new Date(ticket.ticketDetails.eventdate);
     const today = new Date();
     if (eventDate < today) {
       return res.status(400).json({ 
         valid: false, 
         message: "Sự kiện đã kết thúc" 
       });
     }
     
     // Cập nhật trạng thái vé
     ticket.isUsed = true;
     ticket.usedAt = new Date();
     await ticket.save();
     
     return res.json({
       valid: true,
       message: "Vé hợp lệ",
       ticket: {
         _id: ticket._id,
         ticketId: ticket.ticketId,
         eventTitle: ticket.ticketDetails.eventname,
         eventDate: ticket.ticketDetails.eventdate,
         eventTime: ticket.ticketDetails.eventtime,
         location: ticket.eventId.location,
         userName: ticket.ticketDetails.name,
         usedAt: ticket.usedAt
       }
     });
   } catch (error) {
     console.error("Lỗi khi xác thực vé:", error);
     res.status(500).json({ 
       valid: false, 
       message: "Lỗi khi xác thực vé" 
     });
   }
 });

 app.get("/tickets/user/:userId", authenticateFirebaseToken, async (req, res) => {
   try {
     const userId = req.params.userId;
     console.log("Fetching tickets for user ID:", userId);
     
     // Kiểm tra xem userId có phải là ObjectId hợp lệ không
     if (!mongoose.Types.ObjectId.isValid(userId)) {
       return res.status(400).json({ error: "Invalid user ID format" });
     }
     
     // Tìm vé dựa trên userid
     const tickets = await Ticket.find({ userid: userId })
       .populate('eventId', 'title eventDate eventTime location')  // Thêm thông tin event
       .sort({ 'ticketDetails.eventdate': 1 });  // Sắp xếp theo ngày event
 
     console.log(`Found ${tickets.length} tickets for user ${userId}`);
     res.json(tickets);
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
     
     // Kiểm tra không cho phép xóa tài khoản admin mặc định
     const userToDelete = await UserModel.findById(userId);
     if (!userToDelete) {
       return res.status(404).json({ error: "Không tìm thấy người dùng" });
     }
     
     // Không cho phép xóa tài khoản admin@eventems.com
     if (userToDelete.email === "admin@eventems.com") {
       return res.status(403).json({ error: "Không thể xóa tài khoản admin mặc định" });
     }
     
     // Xóa người dùng
     await UserModel.findByIdAndDelete(userId);
     
     // Xóa các sự kiện do người dùng tạo
     await Event.deleteMany({ owner: userId });
     
     // Xóa các vé của người dùng
     await Ticket.deleteMany({ userid: userId });
     
     res.json({ message: "Người dùng đã được xóa thành công" });
   } catch (error) {
     console.error("Lỗi khi xóa người dùng:", error);
     res.status(500).json({ error: "Không thể xóa người dùng" });
   }
 });
 
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`);
   console.log(`Static files served from: ${uploadsPath}`);
});

app.put("/tickets/:id/update-qr", async (req, res) => {
   try {
     const { qr } = req.body;
     const ticketId = req.params.id;
     
     const updatedTicket = await Ticket.findByIdAndUpdate(
       ticketId,
       { 'ticketDetails.qr': qr },
       { new: true }
     );
     
     if (!updatedTicket) {
       return res.status(404).json({ error: "Không tìm thấy vé" });
     }
     
     res.json(updatedTicket);
   } catch (error) {
     console.error("Lỗi khi cập nhật QR code:", error);
     res.status(500).json({ error: "Không thể cập nhật QR code", details: error.message });
   }
 });

 app.post("/register-firebase-user", async (req, res) => {
   try {
     const { uid, name, email, photoURL, role } = req.body;
     
     // Kiểm tra xem người dùng đã tồn tại chưa
     const existingUser = await UserModel.findOne({ uid });
     if (existingUser) {
       return res.status(409).json({ error: "Người dùng đã tồn tại" });
     }
     
     // Tạo người dùng mới
     const newUser = await UserModel.create({
       uid,
       name,
       email,
       photoURL,
       role: role || 'participant'
     });
     
     res.status(201).json({
       _id: newUser._id,
       name: newUser.name,
       email: newUser.email,
       role: newUser.role
     });
   } catch (error) {
     console.error("Lỗi khi đăng ký người dùng Firebase:", error);
     res.status(500).json({ error: "Không thể đăng ký người dùng" });
   }
 });