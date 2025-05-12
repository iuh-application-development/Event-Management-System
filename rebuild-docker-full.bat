@echo off
echo ===== REBUILDING EVENT MANAGEMENT SYSTEM DOCKER CONTAINERS =====
echo.

REM Kiểm tra quyền admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This script requires administrator privileges.
    echo Please run as administrator and try again.
    pause
    exit /b 1
)

REM Dừng và xóa các container đang chạy với tên liên quan
echo Stopping and removing existing containers...
docker-compose down
docker container prune -f

REM Xóa các image cũ để buộc build lại hoàn toàn
echo Removing old images...
FOR /F "tokens=*" %%i IN ('docker images -q event-management-system_api 2^>NUL') DO (
    docker rmi %%i -f
)
FOR /F "tokens=*" %%i IN ('docker images -q event-management-system_client 2^>NUL') DO (
    docker rmi %%i -f
)

REM Xóa cache
echo Cleaning Docker build cache...
docker builder prune -af

REM Build lại với tùy chọn no-cache để buộc rebuild hoàn toàn
echo Building containers with no cache...
docker-compose build --no-cache

REM Nếu build thành công, khởi động container
if %errorlevel% equ 0 (
    echo Starting containers...
    docker-compose up -d
    
    REM Hiển thị logs nhanh để kiểm tra
    timeout /t 5
    echo.
    echo Showing initial logs:
    echo.
    docker-compose logs --tail=20
    
    echo.
    echo ===== EVENT MANAGEMENT SYSTEM STARTED SUCCESSFULLY =====
    echo Frontend: http://localhost
    echo Backend API: http://localhost:4000
    echo.
    echo To view logs, use: docker-compose logs -f
    echo To stop the system, use: docker-compose down
) else (
    echo.
    echo ===== ERROR: BUILD FAILED =====
    echo Please check the build logs above for errors.
    pause
    exit /b 1
)
