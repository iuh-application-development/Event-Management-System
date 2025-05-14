@echo off
REM filepath: c:\Users\ADMIN\OneDrive - Industrial University of HoChiMinh City\Desktop\Event-Management-System\deploy-docker.bat
REM Windows batch script for deploying Docker containers

REM Set up console
setlocal EnableDelayedExpansion
set "GREEN="
set "BLUE="
set "YELLOW="
set "RED="
set "RESET="
set "USE_COLORS=0"

REM Check if ANSI colors are supported
for /f "usebackq tokens=3" %%A in (`reg query HKCU\Console /v VirtualTerminalLevel 2^>nul ^| find "0x1"`) do (
    set "USE_COLORS=1"
    set "GREEN=[92m"
    set "BLUE=[94m"
    set "YELLOW=[93m"
    set "RED=[91m"
    set "RESET=[0m"
)

REM Function to display colorful messages
call :PrintColorMessage "%BLUE%" "Event Management System Docker Deployment Script"
call :PrintColorMessage "%BLUE%" "=========================================="
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call :PrintColorMessage "%RED%" "Docker is not installed. Please install Docker first."
    goto :EOF
)

REM Check if Docker Compose is available
docker compose version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call :PrintColorMessage "%YELLOW%" "Checking older docker-compose command..."
    where docker-compose >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        call :PrintColorMessage "%RED%" "Docker Compose is not installed. Please install Docker Compose first."
        goto :EOF
    ) else (
        set COMPOSE_CMD=docker-compose
    )
) else (
    set COMPOSE_CMD=docker compose
)

REM Check if .env file exists for API, create it if not
if not exist .\api\.env (
    call :PrintColorMessage "%YELLOW%" "Creating .env file from template..."
    if exist .\api\.env.example (
        copy .\api\.env.example .\api\.env
        call :PrintColorMessage "%BLUE%" "Please edit .\api\.env with your actual configuration values."
    ) else (
        call :PrintColorMessage "%RED%" ".env.example not found in .\api directory. Please create .env file manually."
        goto :EOF
    )
)

REM Build and start the containers
call :PrintColorMessage "%BLUE%" "Building and starting Docker containers..."
%COMPOSE_CMD% up --build -d

REM Check if containers are running
%COMPOSE_CMD% ps | findstr "event-api" >nul
if %ERRORLEVEL% EQU 0 (
    echo.
    call :PrintColorMessage "%GREEN%" "Docker containers are running successfully!"
    call :PrintColorMessage "%GREEN%" "Event Management System is now accessible at:"
    call :PrintColorMessage "%BLUE%" "- Frontend: http://localhost"
    call :PrintColorMessage "%BLUE%" "- API: http://localhost:4000"
    echo.
    call :PrintColorMessage "%YELLOW%" "To view logs: %COMPOSE_CMD% logs -f"
    call :PrintColorMessage "%YELLOW%" "To stop containers: %COMPOSE_CMD% down"
) else (
    call :PrintColorMessage "%RED%" "Failed to start Docker containers. Check logs with: %COMPOSE_CMD% logs"
)

:CommandLoop
echo.
echo ========================================
call :PrintColorMessage "%YELLOW%" "Available commands:"
call :PrintColorMessage "%BLUE%" "  logs   - Show container logs"
call :PrintColorMessage "%BLUE%" "  ps     - Show running containers"
call :PrintColorMessage "%BLUE%" "  stop   - Stop containers"
call :PrintColorMessage "%BLUE%" "  start  - Start containers"
call :PrintColorMessage "%BLUE%" "  restart - Restart containers"
call :PrintColorMessage "%BLUE%" "  rebuild - Rebuild and restart containers"
call :PrintColorMessage "%BLUE%" "  q/quit - Exit this script"
echo.
set /p COMMAND="Enter command: "

if "%COMMAND%"=="logs" (
    %COMPOSE_CMD% logs -f
) else if "%COMMAND%"=="ps" (
    %COMPOSE_CMD% ps
) else if "%COMMAND%"=="stop" (
    call :PrintColorMessage "%YELLOW%" "Stopping containers..."
    %COMPOSE_CMD% down
) else if "%COMMAND%"=="start" (
    call :PrintColorMessage "%YELLOW%" "Starting containers..."
    %COMPOSE_CMD% up -d
) else if "%COMMAND%"=="restart" (
    call :PrintColorMessage "%YELLOW%" "Restarting containers..."
    %COMPOSE_CMD% restart
) else if "%COMMAND%"=="rebuild" (
    call :PrintColorMessage "%YELLOW%" "Rebuilding and restarting containers..."
    %COMPOSE_CMD% up --build -d
) else if "%COMMAND%"=="quit" (
    call :PrintColorMessage "%GREEN%" "Exiting script. Have a great day!"
    goto :EOF
) else if "%COMMAND%"=="q" (
    call :PrintColorMessage "%GREEN%" "Exiting script. Have a great day!"
    goto :EOF
) else (
    call :PrintColorMessage "%RED%" "Unknown command: %COMMAND%"
)

goto CommandLoop

:PrintColorMessage
REM Function to print colored text
if "%USE_COLORS%"=="1" (
    for /F "tokens=1,2 delims=%%" %%a in ("%~1") do set "COLOR_CODE=%%b"
    echo %COLOR_CODE%%~2%RESET%
) else (
    echo %~2
)
goto :EOF
