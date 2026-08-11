# Getting Started with HyperAI User Control System

Welcome to the HyperAI User Control System! This guide will help you get started with the application, providing an overview of its features and how to use them effectively.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Setting Up the Environment](#setting-up-the-environment)
4. [Basic Usage](#basic-usage)
5. [Features Overview](#features-overview)
6. [Troubleshooting](#troubleshooting)
7. [Additional Resources](#additional-resources)

## Introduction

The HyperAI User Control System is designed to provide users with a comprehensive interface for managing empathy-driven interactions and Vietnamese cultural intelligence. This application integrates various components to facilitate communication, control, and visualization of empathy metrics.

## Installation

To install the HyperAI User Control System, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/hyperai-user-control-system.git
   ```
2. Navigate to the project directory:
   ```
   cd hyperai-user-control-system
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Setting Up the Environment

Before running the application, ensure that you have the following environment variables set up:

- `REACT_APP_API_URL`: The base URL for the API.
- `REACT_APP_WEBSOCKET_URL`: The WebSocket URL for real-time data.

You can create a `.env` file in the root directory and add the variables as follows:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WEBSOCKET_URL=ws://localhost:5000/socket
```

## Basic Usage

To start the application, run the following command:

```
npm start
```

This will launch the application in your default web browser at `http://localhost:3000`.

## Features Overview

The HyperAI User Control System includes the following key features:

- **Chat Interface**: Engage in conversations using text or voice input.
- **Control Panel**: Adjust system settings, including frequency tuning and empathy metrics.
- **Visualization Tools**: View empathy flow, cultural bridges, and performance metrics.
- **User Profile Management**: Customize user settings and preferences.

## Troubleshooting

If you encounter any issues while using the application, consider the following steps:

- Ensure all dependencies are installed correctly.
- Check the console for any error messages.
- Verify that the API and WebSocket servers are running.

## Additional Resources

For more information, refer to the following resources:

- [API Documentation](../api/empathy-api.md)
- [Voice Control Guide](voice-control.md)
- [Symphony Tuning Guide](symphony-tuning.md)
- [Vietnamese Features Guide](vietnamese-features.md)

Thank you for using the HyperAI User Control System! We hope you find it useful and engaging.