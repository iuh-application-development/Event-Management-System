# Event Management System Docker Setup

This document explains how to build and run the Event Management System using Docker.

## Prerequisites

- Docker
- Docker Compose

## Setup Instructions

1. Make sure you have the following files in place:
   - `.env` file in the `/api` directory with all required environment variables
   - `serviceAccountKey.json` in the `/api` directory for Firebase integration

2. Build and start the containers:

```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:4000

## Environment Variables

Ensure your `.env` file in the `/api` directory contains the following variables:

```
MONGODB_URI=mongodb://mongo:27017/event-management
JWT_SECRET=your-jwt-secret
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
STRIPE_SECRET_KEY=your-stripe-secret-key
```

## Services

- **Frontend**: React application with Vite
- **Backend**: Express.js API server
- **Database**: MongoDB

## Data Persistence

MongoDB data is stored in a Docker volume named `mongo-data` which persists between container restarts.

## Troubleshooting

If you encounter connection issues between services, ensure that:
1. All services are running: `docker-compose ps`
2. The environment variables are properly set
3. The network configuration is correct

For log inspection:
```bash
docker-compose logs api
docker-compose logs client
docker-compose logs mongo
```
