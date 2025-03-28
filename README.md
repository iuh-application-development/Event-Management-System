# EventoEMS - Event Management System

Giới thiệu hệ thống quản lý sự kiện của chúng tôi, một giải pháp được phát triển như một phần của dự án nhóm năm cuối, nhằm tối ưu hóa việc lập kế hoạch, đăng ký và đặt vé cho các sự kiện trong khuôn viên trường. Tôi đóng vai trò quan trọng với tư cách là kiến trúc sư, thiết kế giao diện người dùng với các nguyên tắc thiết kế hiện đại và ưu tiên trải nghiệm người dùng. Chúng tôi đang phát triển hệ thống bằng MERN stack (MongoDB, Express.js, React.js, Node.js) và áp dụng phương pháp Agile Scrum để phát triển hiệu quả.


**Features**
* Lên lịch sự kiện.
* Xem các sự kiện sắp tới.
* Xem lịch sự kiện.
* Phê duyệt sự kiện.
* Đặt vé tham gia sự kiện.
* Tạo mã QR để nhận vé.

**Yêu Cầu**
* Node.js and npm installed
* MongoDB Database

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

<h1>Thank You</h1>
 