# Vietnamese API Documentation

## Overview

The Vietnamese API provides endpoints for processing and analyzing Vietnamese text, enabling applications to leverage cultural intelligence and language processing capabilities.

## Base URL

```
http://<your-server-address>/api/vietnamese
```

## Endpoints

### 1. Analyze Vietnamese Text

- **Endpoint:** `/analyze`
- **Method:** `POST`
- **Description:** Analyzes Vietnamese text and returns linguistic insights along with cultural context.

#### Request Body

```json
{
  "text": "string",
  "analysis_type": "full",
  "include_cultural_context": true,
  "include_traditional_wisdom": true
}
```

#### Parameters

- `text` (string, required): The Vietnamese text to analyze.
- `analysis_type` (string, optional): The type of analysis to perform (default is "full").
- `include_cultural_context` (boolean, optional): Whether to include cultural context in the analysis (default is true).
- `include_traditional_wisdom` (boolean, optional): Whether to include traditional wisdom in the analysis (default is true).

#### Response

- **Status Code:** `200 OK`
- **Response Body:**

```json
{
  "original_text": "string",
  "word_segmentation": ["string"],
  "pos_tags": ["string"],
  "sentiment_score": number,
  "cultural_elements": ["string"],
  "traditional_wisdom": "string",
  "respect_level": "string",
  "regional_influence": "string",
  "business_context": "string",
  "processing_time_ms": number,
  "status": "success"
}
```

### 2. Generate Cultural Content

- **Endpoint:** `/generate`
- **Method:** `POST`
- **Description:** Generates culturally appropriate Vietnamese content based on user input.

#### Request Body

```json
{
  "prompt": "string",
  "cultural_style": "traditional",
  "empathy_level": "high",
  "target_audience": "enterprise"
}
```

#### Parameters

- `prompt` (string, required): The prompt for generating content.
- `cultural_style` (string, optional): The style of cultural content to generate (default is "traditional").
- `empathy_level` (string, optional): The level of empathy to incorporate (default is "high").
- `target_audience` (string, optional): The target audience for the content (default is "enterprise").

#### Response

- **Status Code:** `200 OK`
- **Response Body:**

```json
{
  "generated_content": "string",
  "cultural_authenticity": number,
  "empathy_resonance": number,
  "traditional_elements": ["string"],
  "status": "success"
}
```

## Error Handling

Common error responses include:

- **400 Bad Request:** Invalid input parameters.
- **500 Internal Server Error:** An unexpected error occurred on the server.

## Conclusion

This API enables developers to integrate Vietnamese language processing and cultural intelligence into their applications, enhancing user interactions and content generation.