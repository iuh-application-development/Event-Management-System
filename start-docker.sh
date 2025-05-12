#!/bin/bash

# Script to build and run Docker containers for the Event Management System

echo "Building and starting Event Management System containers..."

# Move to the project directory
cd "$(dirname "$0")"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check for required files
if [ ! -f "./api/.env" ]; then
    echo "Warning: .env file not found in the api directory."
    echo "Please create an .env file with the required environment variables."
fi

if [ ! -f "./api/serviceAccountKey.json" ]; then
    echo "Warning: serviceAccountKey.json not found in the api directory."
    echo "Firebase integration will not work without this file."
fi

# Build and run the containers
echo "Starting Docker containers..."
docker-compose up --build -d

# Check if containers are running
if [ $? -eq 0 ]; then
    echo "Event Management System is now running!"
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost:4000"
    echo ""
    echo "To view logs, run: docker-compose logs -f"
    echo "To stop the system, run: docker-compose down"
else
    echo "Failed to start containers. Check the logs for more information."
    exit 1
fi
