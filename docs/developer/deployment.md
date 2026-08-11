# Deployment Instructions for HyperAI User Control System

This document provides guidelines for deploying the HyperAI User Control System across different environments. Follow the steps outlined below to ensure a successful deployment.

## Prerequisites

Before deploying the application, ensure that you have the following prerequisites:

- Node.js (version 14 or higher)
- Yarn (or npm)
- Docker (for containerized deployment)
- Access to the cloud provider or server where the application will be deployed

## Deployment Steps

### 1. Clone the Repository

Clone the repository to your local machine or server:

```bash
git clone https://github.com/yourusername/hyperai-user-control-system.git
cd hyperai-user-control-system
```

### 2. Install Dependencies

Navigate to the project directory and install the required dependencies:

```bash
yarn install
```

or

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root based on `.env.example`.

```bash
cp .env.example .env
```

The current runtime truth is:

- frontend dev server: Vite
- frontend CI preview: `http://127.0.0.1:4173`
- backend runtime used by CI and Docker: `backend/server.js`
- backend default port: `5000`

Recommended variables:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
# Optional: only set if your socket origin differs from the API origin
# VITE_WEBSOCKET_URL=ws://localhost:5000
```

### 4. Build the Application

Build the production artifact from the project root:

```bash
npm run ci:build
```

### 5. Run the Application

For local frontend development:

```bash
npm start
```

For CI-aligned local verification, run the backend and preview surfaces separately:

```bash
node backend/server.js
npm run preview:ci
```

For production, you can use Docker to run the application:

#### Using Docker

1. Build the Docker images:

```bash
docker-compose build
```

2. Start the containers:

```bash
docker-compose up -d
```

### 6. Access the Application

Once the application is running, you can access it via the following URLs:

- Frontend dev: Vite host/port from local startup output
- Frontend CI preview: `http://127.0.0.1:4173`
- Backend: `http://localhost:5000`

### 7. Verify Before Deploy

The required runtime-aligned checks are:

```bash
npm run ci:build
npm run ci:browser-smoke
```

Optional advisory checks:

```bash
npm test -- --runInBand
npm run lint
```

### 8. Monitor and Maintain

Ensure to monitor the application logs and performance. Use the provided metrics and logging features to maintain the health of the application.

### 9. Update and Redeploy

For updates, pull the latest changes from the repository, rebuild the application, and restart the Docker containers as needed.

## Conclusion

Following these steps will help you deploy the HyperAI User Control System effectively. For any issues or further assistance, refer to the project's documentation or reach out to the development team.
