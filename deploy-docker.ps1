# Function to display colorful messages
function Print-ColorMessage {
    param(
        [string]$color,
        [string]$message
    )
    
    switch ($color) {
        "green" { Write-Host $message -ForegroundColor Green }
        "blue" { Write-Host $message -ForegroundColor Blue }
        "yellow" { Write-Host $message -ForegroundColor Yellow }
        "red" { Write-Host $message -ForegroundColor Red }
        default { Write-Host $message }
    }
}

# Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Print-ColorMessage "red" "Docker is not installed. Please install Docker first."
    exit 1
}

# Check if Docker Compose is available
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Print-ColorMessage "yellow" "Checking if Docker Compose is available through Docker..."
    if (-not (docker compose version -q)) {
        Print-ColorMessage "red" "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
}

# Check if .env file exists for API, create it if not
if (-not (Test-Path -Path "./api/.env")) {
    Print-ColorMessage "yellow" "Creating .env file from template..."
    if (Test-Path -Path "./api/.env.example") {
        Copy-Item -Path "./api/.env.example" -Destination "./api/.env"
        Print-ColorMessage "blue" "Please edit ./api/.env with your actual configuration values."
    }
    else {
        Print-ColorMessage "red" ".env.example not found in ./api directory. Please create .env file manually."
        exit 1
    }
}

# Build and start the containers
Print-ColorMessage "blue" "Building and starting Docker containers..."
docker-compose up --build -d

# Check if containers are running
$containersRunning = docker-compose ps | Select-String "event-api"
if ($containersRunning) {
    Print-ColorMessage "green" "Docker containers are running successfully!"
    Print-ColorMessage "green" "Event Management System is now accessible at:"
    Print-ColorMessage "blue" "- Frontend: http://localhost"
    Print-ColorMessage "blue" "- API: http://localhost:4000"
    Print-ColorMessage "yellow" "To view logs: docker-compose logs -f"
    Print-ColorMessage "yellow" "To stop containers: docker-compose down"
}
else {
    Print-ColorMessage "red" "Failed to start Docker containers. Check logs with: docker-compose logs"
}
