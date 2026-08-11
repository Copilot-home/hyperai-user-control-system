# Symphony API Documentation

## Overview

The Symphony API provides endpoints for interacting with the Empathy Symphony system, allowing users to control and monitor the symphony's performance, manage settings, and retrieve real-time data.

## Base URL

```
http://<your-server-address>/api/symphony
```

## Endpoints

### 1. Get Symphony Status

- **Endpoint:** `/status`
- **Method:** `GET`
- **Description:** Retrieves the current status and metrics of the symphony.

#### Response

```json
{
  "empathy_circulation": "active",
  "frequency": 269,
  "uptime": "1h 30m",
  "ca_dao_broadcasts": 5,
  "active_agents": 3,
  "so_chung_status": "active"
}
```

### 2. Process Empathy

- **Endpoint:** `/process`
- **Method:** `POST`
- **Description:** Processes a message through the empathy engine.

#### Request Body

```json
{
  "message": "Your message here",
  "context": {},
  "frequency": 269,
  "cultural_mode": "vietnamese"
}
```

#### Response

```json
{
  "empathy_score": 0.85,
  "cultural_bridge": "strong",
  "ca_dao_wisdom": "Wisdom text here",
  "processed_message": "Processed message here",
  "symphony_resonance": "high",
  "processing_time_ms": 150,
  "status": "success"
}
```

### 3. Analyze Vietnamese Text

- **Endpoint:** `/analyze`
- **Method:** `POST`
- **Description:** Analyzes Vietnamese text for cultural context and sentiment.

#### Request Body

```json
{
  "text": "Your Vietnamese text here",
  "analysis_type": "full",
  "include_cultural_context": true,
  "include_traditional_wisdom": true
}
```

#### Response

```json
{
  "original_text": "Original text here",
  "word_segmentation": ["word1", "word2"],
  "pos_tags": ["noun", "verb"],
  "sentiment_score": 0.75,
  "cultural_elements": ["element1", "element2"],
  "traditional_wisdom": "Traditional wisdom here",
  "respect_level": "high",
  "regional_influence": "north",
  "business_context": "context here",
  "processing_time_ms": 120,
  "status": "success"
}
```

### 4. Generate Cultural Content

- **Endpoint:** `/generate`
- **Method:** `POST`
- **Description:** Generates culturally appropriate content based on a prompt.

#### Request Body

```json
{
  "prompt": "Your prompt here",
  "cultural_style": "traditional",
  "empathy_level": "high",
  "target_audience": "enterprise"
}
```

#### Response

```json
{
  "generated_content": "Generated content here",
  "cultural_authenticity": 0.9,
  "empathy_resonance": "high",
  "traditional_elements": ["element1", "element2"],
  "status": "success"
}
```

### 5. Health Check

- **Endpoint:** `/health`
- **Method:** `GET`
- **Description:** Checks the health of the symphony system.

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2023-10-01T12:00:00Z",
  "version": "1.0.0",
  "factory_metrics": {
    "empathy_engine": {},
    "vietnamese_nlp": {},
    "symphony_state": {}
  }
}
```

### 6. Live Symphony Feed

- **Endpoint:** `/live`
- **Method:** `GET`
- **Description:** Establishes a WebSocket connection for real-time updates on the symphony's performance.

#### WebSocket Connection

Connect to the WebSocket endpoint to receive live updates on metrics and broadcasts.

## Conclusion

The Symphony API is designed to facilitate interaction with the Empathy Symphony system, providing endpoints for processing empathy, analyzing text, generating content, and monitoring system health.