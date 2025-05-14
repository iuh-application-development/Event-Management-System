#!/bin/bash

# Function to display colorful messages
function print_message() {
    local color=$1
    local message=$2
    
    case $color in
        "green") echo -e "\e[32m$message\e[0m" ;;
        "blue") echo -e "\e[34m$message\e[0m" ;;
        "yellow") echo -e "\e[33m$message\e[0m" ;;
        "red") echo -e "\e[31m$message\e[0m" ;;
        *) echo "$message" ;;
    esac
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_message "red" "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_message "red" "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists for API, create it if not
if [ ! -f "./api/.env" ]; then
    print_message "yellow" "Creating .env file from template..."
    if [ -f "./api/.env.example" ]; then
        cp "./api/.env.example" "./api/.env"
        print_message "blue" "Please edit ./api/.env with your actual configuration values."
    else
        print_message "red" ".env.example not found in ./api directory. Please create .env file manually."
        exit 1
    fi
fi

# Build and start the containers
print_message "blue" "Building and starting Docker containers..."
docker-compose up --build -d

# Check if containers are running
if docker-compose ps | grep -q "event-api"; then
    print_message "green" "Docker containers are running successfully!"
    print_message "green" "Event Management System is now accessible at:"
    print_message "blue" "- Frontend: http://localhost"
    print_message "blue" "- API: http://localhost:4000"
    print_message "yellow" "To view logs: docker-compose logs -f"
    print_message "yellow" "To stop containers: docker-compose down"
else
    print_message "red" "Failed to start Docker containers. Check logs with: docker-compose logs"
fi
