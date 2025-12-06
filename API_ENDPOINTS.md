# iMessage API Server Endpoints

Complete API documentation for the iMessage listener and reply server.

## Base URL

```
http://localhost:3000
```

Or set `PORT` environment variable to use a different port.

## WebSocket Endpoint

```
ws://localhost:3000
```

## REST API Endpoints

### Health Check

**GET** `/api/health`

Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T05:00:00.000Z",
  "listening": true
}
```

---

### Start Listener

**POST** `/api/listener/start`

Start listening for incoming iMessage messages from Kafka.

**Response:**
```json
{
  "success": true,
  "message": "Listener started successfully",
  "listening": true
}
```

**Error Response (if already running):**
```json
{
  "error": "Listener is already running",
  "listening": true
}
```

---

### Stop Listener

**POST** `/api/listener/stop`

Stop listening for messages.

**Response:**
```json
{
  "success": true,
  "message": "Listener stopped successfully",
  "listening": false
}
```

---

### Get Listener Status

**GET** `/api/listener/status`

Get current listener status.

**Response:**
```json
{
  "listening": true,
  "connected": true,
  "clients": 2
}
```

---

### Send Reply

**POST** `/api/reply`

Send a reply message to a chat.

**Request Body:**
```json
{
  "chatId": "1701616",
  "message": "Hello! This is a reply"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reply sent successfully",
  "data": {
    "messageId": "53562256",
    "chatId": "1701616",
    "text": "Hello! This is a reply",
    "sentAt": "2025-12-05 23:32:57 -0600"
  }
}
```

**Error Response:**
```json
{
  "error": "Failed to send reply",
  "message": "Error message",
  "details": {}
}
```

---

### Get Chat Messages

**GET** `/api/chats/:chatId/messages`

Get all messages for a specific chat.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "53562256",
      "chat_id": "1701616",
      "text": "Hello!",
      "from_phone": "+16463458837",
      "sent_at": "2025-12-05 23:32:57 -0600",
      "is_read": false
    }
  ]
}
```

---

### Get All Chats

**GET** `/api/chats`

Get all chats. Supports query parameters.

**Query Parameters:**
- `phone_number` (optional) - Filter by phone number
- `page` (optional) - Page number (default: 1)
- `per_page` (optional) - Items per page (default: 25, max: 100)

**Example:**
```
GET /api/chats?phone_number=+1234567890&page=1&per_page=25
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1701616",
      "phone_numbers": ["+1234567890"],
      "last_message": "Hello!",
      "updated_at": "2025-12-05T23:32:57-06:00"
    }
  ]
}
```

---

## WebSocket API

### Connection

Connect to `ws://localhost:3000` to receive real-time message updates.

### Message Types

#### Connected

Sent when client connects:

```json
{
  "type": "connected",
  "message": "Connected to iMessage listener",
  "listening": true,
  "timestamp": "2025-12-06T05:00:00.000Z"
}
```

#### Message Received

Sent when a new iMessage is received:

```json
{
  "type": "message.received",
  "event": {
    "id": "a9fd569f-59a4-4f0e-ab35-ac6acf92eb0b",
    "createdAt": "2025-12-05T14:42:06-06:00",
    "data": {
      "from": "+19176256109",
      "text": "Hello!",
      "chatId": "1701616",
      "sentAt": "2025-12-05 14:42:05 -0600",
      "service": "iMessage",
      "isRead": false,
      "attachments": [],
      "participants": [
        {
          "display_name": "You",
          "identifier": "+16463458837",
          "is_me": true
        }
      ]
    }
  }
}
```

#### Message Sent

Sent when a message is sent (confirmation):

```json
{
  "type": "message.sent",
  "event": {
    "id": "cd10fae9-9903-4afc-953d-4fb13b7b8c43",
    "createdAt": "2025-12-05T23:32:58-06:00",
    "data": {
      "from": "+16463458837",
      "text": "Hello! This is a reply",
      "chatId": "1701616",
      "sentAt": "2025-12-05 23:32:57 -0600",
      "messageId": "53562256"
    }
  }
}
```

#### Typing Indicator Received

Sent when someone starts typing:

```json
{
  "type": "typing_indicator.received",
  "event": {
    "id": "f1800df2-004f-4faf-bee8-0e3b1b1d202f",
    "createdAt": "2025-12-05T14:41:50-06:00",
    "data": {
      "chatId": "1701616",
      "display": true,
      "timestamp": "2025-12-05T14:41:50-06:00"
    }
  }
}
```

#### Typing Indicator Removed

Sent when someone stops typing:

```json
{
  "type": "typing_indicator.removed",
  "event": {
    "id": "7dc7fdf2-ac08-4feb-b88a-1f3d381dd35f",
    "createdAt": "2025-12-05T14:42:05-06:00",
    "data": {
      "chatId": "1701616",
      "display": false,
      "timestamp": "2025-12-05T14:42:05-06:00"
    }
  }
}
```

### Sending Messages via WebSocket

You can send replies directly through WebSocket:

**Send Reply:**
```json
{
  "type": "send_reply",
  "chatId": "1701616",
  "message": "Hello! This is a reply"
}
```

**Success Response:**
```json
{
  "type": "reply_sent",
  "success": true,
  "data": {
    "messageId": "53562256",
    "chatId": "1701616",
    "text": "Hello! This is a reply",
    "sentAt": "2025-12-05 23:32:57 -0600"
  }
}
```

**Error Response:**
```json
{
  "type": "error",
  "message": "Failed to send reply",
  "error": "Error message",
  "details": {}
}
```

---

## Usage Examples

### cURL Examples

**Start Listener:**
```bash
curl -X POST http://localhost:3000/api/listener/start
```

**Stop Listener:**
```bash
curl -X POST http://localhost:3000/api/listener/stop
```

**Get Status:**
```bash
curl http://localhost:3000/api/listener/status
```

**Send Reply:**
```bash
curl -X POST http://localhost:3000/api/reply \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "1701616",
    "message": "Hello! This is a reply"
  }'
```

**Get Chats:**
```bash
curl http://localhost:3000/api/chats
```

**Get Messages:**
```bash
curl http://localhost:3000/api/chats/1701616/messages
```

### JavaScript/Node.js Example

```javascript
const WebSocket = require('ws');

// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to iMessage listener');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'message.received') {
    console.log('New message:', message.event.data.text);
    console.log('From:', message.event.data.from);
    
    // Send a reply
    ws.send(JSON.stringify({
      type: 'send_reply',
      chatId: message.event.data.chatId,
      message: 'Hello! I received your message.'
    }));
  }
});
```

### Python Example

```python
import websocket
import json
import requests

# Start listener via REST API
response = requests.post('http://localhost:3000/api/listener/start')
print(response.json())

# Connect to WebSocket
def on_message(ws, message):
    data = json.loads(message)
    
    if data['type'] == 'message.received':
        print(f"New message: {data['event']['data']['text']}")
        print(f"From: {data['event']['data']['from']}")
        
        # Send reply
        reply = {
            'type': 'send_reply',
            'chatId': data['event']['data']['chatId'],
            'message': 'Hello! I received your message.'
        }
        ws.send(json.dumps(reply))

ws = websocket.WebSocketApp("ws://localhost:3000", on_message=on_message)
ws.run_forever()
```

---

## Environment Variables

Make sure your `.env` file contains:

```env
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=pkc-619z3.us-east1.gcp.confluent.cloud:9092
KAFKA_TOPIC_NAME=team.team.08c7dfa9e986432d891385b64f410bba
KAFKA_CONSUMER_GROUP=team-cg-08c7dfa9e986432d891385b64f410bba
KAFKA_CLIENT_ID=team-client-08c7dfa9e986432d891385b64f410bba
KAFKA_SASL_USERNAME=QRHNR6BCKVHD4M3U
KAFKA_SASL_PASSWORD=your-password
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_TLS_ENABLED=true

# Series API Configuration
SERIES_API_KEY=e2b25488-7f80-459b-833e-83439e200bda
SERIES_API_BASE_URL=https://series-hackathon-service-202642739529.us-east1.run.app

# Server Configuration (optional)
PORT=3000
```

---

## Starting the Server

```bash
npm install
npm start
```

Or:

```bash
node server.js
```

The server will start on port 3000 (or the port specified in `PORT` environment variable).

