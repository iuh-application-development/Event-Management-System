# Event Management System - Docker Deployment

This document explains how to deploy the Event Management System using Docker.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your machine
- [Docker Compose](https://docs.docker.com/compose/install/) installed on your machine

## Environment Setup

1. Create a `.env` file in the `api` directory based on the `.env.example` template:

```bash
cd api
cp .env.example .env
```

2. Edit the `.env` file with your actual configuration values (API keys, secrets, etc.)

## Building and Running with Docker Compose

From the root directory of the project, run:

```bash
docker-compose up --build
```

This will:
- Build the Docker images for the API and client
- Start MongoDB, API, and client containers
- Set up networking between the containers

To run the containers in the background (detached mode):

```bash
docker-compose up -d
```

To stop the containers:

```bash
docker-compose down
```

## Accessing the Application

- Frontend: http://localhost
- API: http://localhost:4000
- MongoDB: mongodb://localhost:27017 (accessible from your host machine)

## Container Maintenance

### View running containers:
```bash
docker-compose ps
```

### View logs:
```bash
# View all logs
docker-compose logs

# View logs for a specific service
docker-compose logs api
docker-compose logs client
docker-compose logs mongodb

# Follow logs in real-time
docker-compose logs -f
```

### Restart a service:
```bash
docker-compose restart api
```

### Shell access to containers:
```bash
docker-compose exec api sh
docker-compose exec client sh
docker-compose exec mongodb bash
```

## Data Persistence

- MongoDB data is persisted in a Docker volume (`mongo_data`)
- Uploaded files in the API are persisted using a bind mount to the host's `api/uploads` directory

## Production Considerations

For production deployment, consider:

1. Using environment variables for sensitive information rather than .env files
2. Setting up proper SSL/TLS certificates for HTTPS
3. Implementing container health checks
4. Setting up a proper reverse proxy like Nginx or Traefik
5. Implementing Docker secrets for sensitive data
6. Using a container orchestration platform like Kubernetes for larger deployments
