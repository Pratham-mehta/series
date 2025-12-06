# Series iMessage Service API Documentation

Complete API client implementation for the Series iMessage Service Hackathon API.

## Setup

1. **Add API credentials to your `.env` file:**

```env
SERIES_API_BASE_URL=https://your-api-base-url.com
SERIES_API_KEY=your-api-key-here
```

2. **Use the API client:**

```javascript
const SeriesAPIClient = require('./api/client');

const client = new SeriesAPIClient();
// Credentials are automatically loaded from environment variables
```

## API Endpoints

### Chats

#### List Chats
```javascript
// GET /api/chats
const response = await client.listChats({
  phoneNumber: '+1234567890',  // Optional: filter by participant phone
  page: 1,                      // Optional: default 1, min 1
  perPage: 25,                  // Optional: default 25, max 100
});
```

#### Create Chat
```javascript
// POST /api/chats
const response = await client.createChat({
  send_from: '+16463458837',    // Required: E.164 phone format
  chat: {
    phone_numbers: ['+19176256109'], // Required: min 1 recipient
    display_name: 'Group Name',       // Optional: for group chats
  },
  message: {
    text: 'Hello!',              // Required: cannot be empty
  },
});
```

#### Get Chat
```javascript
// GET /api/chats/{id}
const response = await client.getChat(chatId);
```

#### Find Chat
```javascript
// GET /api/chats/find
const response = await client.findChat({
  phoneNumber: '+1234567890',   // Optional: primary phone
  phoneNumbers: ['+1234567890', '+0987654321'], // Optional: additional phones
});
```

#### Mark Chat as Read
```javascript
// PUT /api/chats/{id}/mark_as_read
const response = await client.markChatAsRead(chatId);
```

#### Start Typing Indicator
```javascript
// POST /api/chats/{id}/start_typing
const response = await client.startTyping(chatId);
```

#### Stop Typing Indicator
```javascript
// DELETE /api/chats/{id}/stop_typing
const response = await client.stopTyping(chatId);
```

### Chat Messages

#### List Chat Messages
```javascript
// GET /api/chats/{chat_id}/chat_messages
const response = await client.listChatMessages(chatId);
```

#### Create Chat Message
```javascript
// POST /api/chats/{chat_id}/chat_messages
const response = await client.createChatMessage(chatId, {
  message: {
    text: 'Hello!',              // Required
    attachments: [               // Optional
      {
        filename: 'image.jpg',
        mime_type: 'image/jpeg',
        data_base64: 'base64encodeddata...', // No data URI prefix
      },
    ],
  },
});
```

#### Get Chat Message
```javascript
// GET /api/chats/{chat_id}/chat_messages/{message_id}
const response = await client.getChatMessage(chatId, messageId);
```

#### Delete Chat Message
```javascript
// DELETE /api/chats/{chat_id}/chat_messages/{message_id}
const response = await client.deleteChatMessage(chatId, messageId);
```

#### Edit Chat Message
```javascript
// POST /api/chats/{chat_id}/chat_messages/{message_id}/edit
// Note: Messages can only be edited within 15 minutes of creation
const response = await client.editChatMessage(chatId, messageId, {
  text: 'Edited message text',
});
```

### Message Reactions

#### React to Message
```javascript
// POST /api/chat_messages/{id}/reactions
const { ReactionTypes, ReactionOperations } = require('./api/schemas');

const response = await client.reactToMessage(messageId, {
  operation: ReactionOperations.ADD,  // 'add' or 'remove'
  type: ReactionTypes.LIKE,          // 'love', 'like', 'dislike', 'laugh', 'emphasize', 'question'
});
```

#### Get Reaction
```javascript
// GET /api/chat_message_reactions/{id}
const response = await client.getReaction(reactionId);
```

### iMessage Availability

#### Check iMessage Availability
```javascript
// POST /api/i_message_availability/check
const response = await client.checkIMessageAvailability({
  phone_number: '+1234567890',
});
```

## Reaction Types

Available reaction types (from `api/schemas.js`):

- `ReactionTypes.LOVE` - 'love'
- `ReactionTypes.LIKE` - 'like'
- `ReactionTypes.DISLIKE` - 'dislike'
- `ReactionTypes.LAUGH` - 'laugh'
- `ReactionTypes.EMPHASIZE` - 'emphasize'
- `ReactionTypes.QUESTION` - 'question'

## Reaction Operations

- `ReactionOperations.ADD` - 'add'
- `ReactionOperations.REMOVE` - 'remove'

## Error Handling

All API methods return promises that can be caught:

```javascript
try {
  const response = await client.createChat(payload);
  console.log('Success:', response.data);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Status:', error.status);
  console.error('Details:', error.data);
}
```

## Response Format

All successful API calls return:

```javascript
{
  status: 200,           // HTTP status code
  data: { ... },        // Response body (parsed JSON)
  headers: { ... },     // Response headers
}
```

Error responses throw an error object:

```javascript
{
  status: 400,          // HTTP status code
  message: 'Error message',
  data: { ... },       // Error details (if available)
}
```

## Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer <API_KEY>
```

The API key is automatically included in all requests when using the `SeriesAPIClient` class.

## Examples

Run the complete examples:

```bash
npm run api-examples
```

Or use the examples file directly:

```bash
node examples/api-examples.js
```

## Integration with Kafka

You can combine the API client with Kafka consumer to react to incoming messages:

```javascript
const SeriesAPIClient = require('./api/client');
const KafkaConsumer = require('./kafka/consumer');

const apiClient = new SeriesAPIClient();
const consumer = new KafkaConsumer();

// Handle incoming messages from Kafka
consumer.onEvent('message.received', async (eventData) => {
  const message = eventData.data;
  
  // Auto-reply example
  if (message.text.toLowerCase().includes('hello')) {
    await apiClient.createChatMessage(message.chat_id, {
      message: {
        text: 'Hello! How can I help you?',
      },
    });
  }
});

await consumer.connect();
await consumer.start();
```

## Phone Number Format

All phone numbers must be in E.164 format:
- Starts with `+`
- Country code
- Number (no spaces, dashes, or parentheses)
- Example: `+16463458837`

## Message Editing

Messages can only be edited within **15 minutes** of creation. Attempting to edit a message after this window will result in a 422 error.

## Recommended Send Flow

1. **Create chat (and initial message)** with `POST /api/chats`
   - Returns `id` for the chat
   
2. **Send additional messages** with `POST /api/chats/{chat_id}/chat_messages`
   - Use the chat ID from step 1
   
3. **Add reactions** with `POST /api/chat_messages/{id}/reactions`
   - Use message IDs from step 2

## Complete Example

```javascript
const SeriesAPIClient = require('./api/client');

async function sendMessage() {
  const client = new SeriesAPIClient();
  
  // Step 1: Create chat and send initial message
  const chat = await client.createChat({
    send_from: '+16463458837',
    chat: {
      phone_numbers: ['+19176256109'],
    },
    message: {
      text: 'Hello!',
    },
  });
  
  const chatId = chat.data.id;
  
  // Step 2: Send follow-up message
  await client.createChatMessage(chatId, {
    message: {
      text: 'This is a follow-up!',
    },
  });
  
  // Step 3: Start typing indicator
  await client.startTyping(chatId);
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 4: Stop typing and send another message
  await client.stopTyping(chatId);
  await client.createChatMessage(chatId, {
    message: {
      text: 'Done typing!',
    },
  });
}

sendMessage();
```

## Support

For API-specific issues:
- Check the OpenAPI specification at `/openapi.json` on your API server
- Review error responses for detailed error messages
- Ensure all required fields are provided
- Verify phone numbers are in E.164 format

