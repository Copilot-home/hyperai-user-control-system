# Empathy API Documentation

## Overview

The Empathy API provides endpoints for processing empathy-related requests and managing interactions within the HyperAI user control system. This API is designed to facilitate communication between the user interface and the backend services, enabling users to engage with the empathy features of the application.

## Base URL

```
http://<your-server-address>/api/empathy
```

## Endpoints

### 1. Process Empathy

- **Endpoint:** `/process`
- **Method:** `POST`
- **Description:** Processes a message through the empathy engine and returns an empathy score along with other relevant data.
- **Request Body:**
  ```json
  {
    "message": "string",
    "context": {
      "key": "value"
    },
    "frequency": 269,
    "cultural_mode": "string"
  }
  ```
- **Response:**
  - **Success (200):**
    ```json
    {
      "empathy_score": "number",
      "cultural_bridge": "string",
      "ca_dao_wisdom": "string",
      "processed_message": "string",
      "symphony_resonance": "string",
      "processing_time_ms": "number",
      "status": "success"
    }
    ```
  - **Error (500):**
    ```json
    {
      "detail": "string"
    }
    ```

### 2. Get Symphony Status

- **Endpoint:** `/status`
- **Method:** `GET`
- **Description:** Retrieves the current status of the empathy symphony, including uptime and metrics.
- **Response:**
  - **Success (200):**
    ```json
    {
      "empathy_circulation": "string",
      "frequency": "number",
      "uptime": "string",
      "ca_dao_broadcasts": "number",
      "active_agents": "number",
      "so_chung_status": "string"
    }
    ```

### 3. Generate Cultural Content

- **Endpoint:** `/generate`
- **Method:** `POST`
- **Description:** Generates culturally appropriate content based on the provided prompt and parameters.
- **Request Body:**
  ```json
  {
    "prompt": "string",
    "cultural_style": "string",
    "empathy_level": "string",
    "target_audience": "string"
  }
  ```
- **Response:**
  - **Success (200):**
    ```json
    {
      "generated_content": "string",
      "cultural_authenticity": "number",
      "empathy_resonance": "string",
      "traditional_elements": "string",
      "status": "success"
    }
    ```
  - **Error (500):**
    ```json
    {
      "detail": "string"
    }
    ```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in the response body. Common error codes include:

- **400 Bad Request:** Invalid input data.
- **401 Unauthorized:** Authentication required.
- **404 Not Found:** Endpoint not found.
- **500 Internal Server Error:** An unexpected error occurred.

## Conclusion

This API documentation provides a comprehensive overview of the Empathy API, detailing the available endpoints, request and response formats, and error handling mechanisms. For further assistance, please refer to the user guide or contact support.