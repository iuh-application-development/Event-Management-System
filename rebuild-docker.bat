@echo off
echo Rebuilding Docker containers for Event Management System...

REM Dừng các container hiện tại
docker-compose down

REM Xây dựng lại các container
docker-compose build --no-cache

REM Khởi động lại các container
docker-compose up -d

REM Hiển thị trạng thái
echo.
echo Các container đã được khởi động lại. Có thể truy cập:
echo Frontend: http://localhost
echo Backend API: http://localhost:4000
echo.
echo Để xem logs, sử dụng: docker-compose logs -f
