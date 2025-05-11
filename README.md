# EventoEMS - Event Management System

Giới thiệu hệ thống quản lý sự kiện của chúng tôi, một giải pháp được phát triển như một phần của dự án nhóm năm cuối, nhằm tối ưu hóa việc lập kế hoạch, đăng ký và đặt vé cho các sự kiện trong khuôn viên trường. Tôi đóng vai trò quan trọng với tư cách là kiến trúc sư, thiết kế giao diện người dùng với các nguyên tắc thiết kế hiện đại và ưu tiên trải nghiệm người dùng. Chúng tôi đang phát triển hệ thống bằng MERN stack (MongoDB, Express.js, React.js, Node.js) và áp dụng phương pháp Agile Scrum để phát triển hiệu quả.


**Features**
* Lên lịch sự kiện.
* Xem các sự kiện sắp tới.
* Xem lịch sự kiện.
* Phê duyệt sự kiện.
* Đặt vé tham gia sự kiện.
* Tạo mã QR để nhận vé.
* Thanh toán trực tuyến với Stripe.
* Xác thực SMS cho đặt vé.
* Quản lý người dùng với hệ thống phân quyền.
* Đăng nhập/Đăng ký với Firebase Authentication.
* Quét mã QR để xác thực vé tại sự kiện.

**Yêu Cầu**
* Node.js và npm
* MongoDB Database
* Tài khoản Stripe (để xử lý thanh toán)
* Tài khoản Twilio (để gửi SMS xác thực)
* Tài khoản Firebase (để xác thực người dùng)

**Cài đặt**
1. Clone repository về 
2. Điều hướng đến thư mục dự án, sử dụng hai terminal: <br>
    **Cd Client** - For Frontend <br>
    **Cd api** - For Backend <br>
3. Cài đặt các thư viện cần thiết cho cả frontend và backend.
4. Tạo tệp .env trong thư mục gốc với nội dung sau và thay thế chuỗi kết nối  mongodb atlas:  <br>
     MONGODB_URI=mongodb://localhost/your-database-name
5. Start the server.<br>
     **ems/api:** nodemon start<br>
7. Start the Client:<br>
      **ems/client:** npm run dev

**Ứng dụng sẽ chạy tại: http://localhost:5173**<br>
**Máy chủ đang chạy tại: http://localhost:4000**

**Hệ thống phân quyền**
Hệ thống có 3 vai trò người dùng:

Admin

Quản lý tất cả người dùng và sự kiện
Phê duyệt sự kiện
Xem thống kê hệ thống
Xác thực vé
Organizer

Tạo và quản lý sự kiện của mình
Xác thực vé tại sự kiện
Xem danh sách người tham gia
Participant

Xem và đăng ký tham gia sự kiện
Mua vé và thanh toán
Xem lịch sử vé đã mua
Tài khoản mặc định
Hệ thống tự động tạo tài khoản admin khi khởi động:

Email: admin@eventems.com
Password: admin123
Kiểm thử thanh toán với Stripe
Khi test hệ thống thanh toán, sử dụng thẻ test của Stripe:

Số thẻ: 4242 4242 4242 4242
Ngày hết hạn: Bất kỳ ngày nào trong tương lai
CVC: Bất kỳ 3 số nào
ZIP: Bất kỳ 5 số nào
 
