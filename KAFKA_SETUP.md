# Kafka Setup Guide for Series 2.0

This guide will help you set up and use Kafka integration with your Confluent Cloud cluster.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Access to your Confluent Cloud Kafka cluster credentials

## Installation

1. **Install dependencies:**

```bash
npm install
```

This will install:
- `kafkajs` - Kafka client for Node.js
- `dotenv` - Environment variable management

## Configuration

1. **Create your `.env` file:**

Copy the example environment file:

```bash
cp .env.example .env
```

2. **Fill in your credentials:**

Open `.env` and update it with your actual Kafka credentials from your hackathon dashboard:

```env
KAFKA_BOOTSTRAP_SERVERS=pkc-619z3.us-east1.gcp.confluent.cloud:9092
KAFKA_TOPIC_NAME=team.team.08c7dfa9e986432d891385b64f410bba
KAFKA_CONSUMER_GROUP=team-cg-08c7dfa9e986432d891385b64f410bba
KAFKA_CLIENT_ID=team-client-08c7dfa9e986432d891385b64f410bba
KAFKA_SASL_USERNAME=QRHNR6BCKVHD4M3U
KAFKA_SASL_PASSWORD=your-actual-password
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_TLS_ENABLED=true
```

**⚠️ Security Warning:** Never commit your `.env` file to version control. It's already included in `.gitignore`.

## Usage

### Sending Messages (Producer)

Run the producer example to send messages to your Kafka topic:

```bash
npm run producer
```

Or directly:

```bash
node examples/send-message.js
```

This will:
1. Connect to your Kafka cluster
2. Send a test message
3. Send a message in Series API format
4. Send a batch of messages

### Consuming Messages (Consumer)

Run the consumer example to listen for messages from your Kafka topic:

```bash
npm run consumer
```

Or directly:

```bash
node examples/consume-messages.js
```

This will:
1. Connect to your Kafka cluster
2. Subscribe to your topic
3. Listen for incoming messages
4. Process events (message.received, typing_indicator.received, etc.)

Press `Ctrl+C` to stop the consumer.

## Using in Your Code

### Producer Example

```javascript
const KafkaProducer = require('./kafka/producer');

async function sendMessage() {
  const producer = new KafkaProducer();
  
  try {
    await producer.connect();
    
    const message = {
      event: 'my_event',
      data: {
        message: 'Hello Kafka!',
        timestamp: new Date().toISOString()
      }
    };
    
    await producer.sendMessage(message);
    await producer.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Consumer Example

```javascript
const KafkaConsumer = require('./kafka/consumer');

async function consumeMessages() {
  const consumer = new KafkaConsumer();
  
  // Register custom event handlers
  consumer.onEvent('message.received', async (eventData) => {
    console.log('New message:', eventData.data);
    // Your custom logic here
  });
  
  try {
    await consumer.connect();
    await consumer.start();
    
    // Keep process alive
    // Consumer will continue listening for messages
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Event Types

The consumer handles the following event types from the Series API:

### 1. `message.received`

Triggered when a new message is received.

**Event Structure:**
```json
{
  "api_version": "v2",
  "created_at": "2025-12-05T14:42:06-06:00",
  "data": {
    "attachments": [],
    "chat_handles": [
      { "display_name": "You", "identifier": "+16463458837", "is_me": true },
      { "display_name": "+1 (917) 625-6109", "identifier": "+19176256109", "is_me": false }
    ],
    "chat_id": "1698665",
    "from_phone": "+19176256109",
    "id": "53077912",
    "is_read": false,
    "reaction_id": null,
    "sent_at": "2025-12-05 14:42:05 -0600",
    "service": "iMessage",
    "text": "Fianko just posted."
  },
  "event_id": "a9fd569f-59a4-4f0e-ab35-ac6acf92eb0b",
  "event_type": "message.received"
}
```

### 2. `typing_indicator.received`

Triggered when someone starts typing.

**Event Structure:**
```json
{
  "api_version": "v2",
  "created_at": "2025-12-05T14:41:50-06:00",
  "data": {
    "chat_handles": [...],
    "chat_id": "1698665",
    "display": true,
    "timestamp": "2025-12-05T14:41:50-06:00"
  },
  "event_id": "f1800df2-004f-4faf-bee8-0e3b1b1d202f",
  "event_type": "typing_indicator.received"
}
```

### 3. `typing_indicator.removed`

Triggered when someone stops typing.

**Event Structure:**
```json
{
  "api_version": "v2",
  "created_at": "2025-12-05T14:42:05-06:00",
  "data": {
    "chat_handles": [...],
    "chat_id": "1698665",
    "display": false,
    "timestamp": "2025-12-05T14:42:05-06:00"
  },
  "event_id": "7dc7fdf2-ac08-4feb-b88a-1f3d381dd35f",
  "event_type": "typing_indicator.removed"
}
```

## Custom Event Handlers

You can register custom handlers for specific event types:

```javascript
consumer.onEvent('message.received', async (eventData) => {
  // Custom logic for handling messages
  const message = eventData.data;
  console.log(`New message from ${message.from_phone}: ${message.text}`);
  
  // Example: Save to database, send notification, etc.
});
```

## Error Handling

Both producer and consumer include error handling:

- Connection errors are caught and logged
- Message sending errors are caught and logged
- Consumer automatically retries on connection failures
- Graceful shutdown on SIGINT/SIGTERM

## Troubleshooting

### Connection Issues

1. **Check your credentials:** Verify all environment variables in `.env` are correct
2. **Check network:** Ensure you can reach the Confluent Cloud endpoint
3. **Check TLS:** Verify `KAFKA_TLS_ENABLED=true` matches your cluster settings

### Message Not Received

1. **Check consumer group:** Ensure you're using the correct consumer group
2. **Check topic name:** Verify the topic name matches your cluster
3. **Check offset:** Consumer starts from latest by default. Set `fromBeginning: true` in `consumer.js` to read from the beginning

### Authentication Errors

1. **Check SASL credentials:** Verify username and password are correct
2. **Check mechanism:** Ensure `KAFKA_SASL_MECHANISM=PLAIN` matches your cluster

## Project Structure

```
Series 2.0/
├── kafka/
│   ├── config.js          # Kafka configuration and connection setup
│   ├── producer.js        # Producer implementation
│   └── consumer.js        # Consumer implementation
├── examples/
│   ├── send-message.js    # Producer example
│   └── consume-messages.js # Consumer example
├── .env.example           # Environment variables template
├── .env                   # Your actual credentials (not in git)
├── package.json           # Dependencies
└── KAFKA_SETUP.md        # This file
```

## Next Steps

1. Set up your `.env` file with credentials
2. Run `npm install` to install dependencies
3. Test the producer: `npm run producer`
4. Test the consumer: `npm run consumer`
5. Integrate Kafka into your application code

## Support

For issues or questions:
- Check the Series API documentation in your hackathon dashboard
- Review Kafka.js documentation: https://kafka.js.org/
- Check Confluent Cloud documentation for cluster-specific issues

