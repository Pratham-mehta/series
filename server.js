require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const KafkaConsumer = require('./kafka/consumer');
const SeriesAPIClient = require('./api/client');
const DynamoDBHelper = require('./db/dynamodb');

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time message delivery
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Store active consumer and clients
let activeConsumer = null;
let isListening = false;
const connectedClients = new Set();

// Initialize API client (with error handling)
let apiClient = null;
try {
  apiClient = new SeriesAPIClient();
} catch (error) {
  console.warn('⚠️  API client initialization failed:', error.message);
  console.warn('   Some endpoints may not work until API credentials are configured.');
}

// Initialize DynamoDB helper
const db = new DynamoDBHelper();

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Setup Kafka consumer with event handlers
 */
function setupConsumer() {
  if (activeConsumer) {
    return activeConsumer;
  }

  try {
    // Use unique consumer group to avoid conflicts
    process.env.KAFKA_USE_UNIQUE_GROUP = 'true';

    const consumer = new KafkaConsumer();

    // Handle incoming messages
    consumer.onEvent('message.received', async (eventData) => {
      const { data } = eventData;
      
      const messageData = {
        type: 'message.received',
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            from: data.from_phone,
            text: data.text,
            chatId: data.chat_id,
            sentAt: data.sent_at,
            service: data.service,
            isRead: data.is_read,
            attachments: data.attachments || [],
            participants: data.chat_handles || [],
          },
        },
      };

      // Broadcast to all connected clients
      broadcast(messageData);
    });

    // Handle typing indicators
    consumer.onEvent('typing_indicator.received', async (eventData) => {
      const { data } = eventData;
      
      broadcast({
        type: 'typing_indicator.received',
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            chatId: data.chat_id,
            display: data.display,
            timestamp: data.timestamp,
          },
        },
      });
    });

    consumer.onEvent('typing_indicator.removed', async (eventData) => {
      const { data } = eventData;
      
      broadcast({
        type: 'typing_indicator.removed',
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            chatId: data.chat_id,
            display: data.display,
            timestamp: data.timestamp,
          },
        },
      });
    });

    // Handle message.sent events (messages we sent)
    consumer.onEvent('message.sent', async (eventData) => {
      const { data } = eventData;
      
      broadcast({
        type: 'message.sent',
        event: {
          id: eventData.event_id,
          createdAt: eventData.created_at,
          data: {
            from: data.from_phone,
            text: data.text,
            chatId: data.chat_id,
            sentAt: data.sent_at,
            messageId: data.id,
          },
        },
      });
    });

    activeConsumer = consumer;
    return consumer;
  } catch (error) {
    console.error('Error setting up consumer:', error);
    throw error;
  }
}

// ==================== REST API Endpoints ====================

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    listening: isListening,
  });
});

/**
 * Start listening for messages
 * POST /api/listener/start
 */
app.post('/api/listener/start', async (req, res) => {
  try {
    if (isListening) {
      return res.status(400).json({
        error: 'Listener is already running',
        listening: true,
      });
    }

    const consumer = setupConsumer();
    
    await consumer.connect();
    await consumer.start();
    
    isListening = true;

    res.json({
      success: true,
      message: 'Listener started successfully',
      listening: true,
    });
  } catch (error) {
    console.error('Error starting listener:', error);
    res.status(500).json({
      error: 'Failed to start listener',
      message: error.message,
    });
  }
});

/**
 * Stop listening for messages
 * POST /api/listener/stop
 */
app.post('/api/listener/stop', async (req, res) => {
  try {
    if (!isListening || !activeConsumer) {
      return res.status(400).json({
        error: 'Listener is not running',
        listening: false,
      });
    }

    await activeConsumer.stop();
    activeConsumer = null;
    isListening = false;

    res.json({
      success: true,
      message: 'Listener stopped successfully',
      listening: false,
    });
  } catch (error) {
    console.error('Error stopping listener:', error);
    res.status(500).json({
      error: 'Failed to stop listener',
      message: error.message,
    });
  }
});

/**
 * Get listener status
 * GET /api/listener/status
 */
app.get('/api/listener/status', (req, res) => {
  res.json({
    listening: isListening,
    connected: activeConsumer !== null,
    clients: connectedClients.size,
  });
});

/**
 * Send a reply to a chat
 * POST /api/reply
 * Body: { chatId: string, message: string }
 */
app.post('/api/reply', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure SERIES_API_KEY and SERIES_API_BASE_URL environment variables',
      });
    }

    const { chatId, message } = req.body;

    if (!chatId) {
      return res.status(400).json({
        error: 'chatId is required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'message is required and cannot be empty',
      });
    }

    const response = await apiClient.createChatMessage(chatId, {
      message: {
        text: message.trim(),
      },
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        messageId: response.data.id,
        chatId: response.data.chat_id,
        text: response.data.text,
        sentAt: response.data.sent_at,
      },
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(error.status || 500).json({
      error: 'Failed to send reply',
      message: error.message,
      details: error.data,
    });
  }
});

/**
 * Get chat messages
 * GET /api/chats/:chatId/messages
 */
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure SERIES_API_KEY and SERIES_API_BASE_URL environment variables',
      });
    }

    const { chatId } = req.params;
    const response = await apiClient.listChatMessages(chatId);

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(error.status || 500).json({
      error: 'Failed to fetch messages',
      message: error.message,
      details: error.data,
    });
  }
});

/**
 * Get all chats
 * GET /api/chats
 */
app.get('/api/chats', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(503).json({
        error: 'API client not initialized',
        message: 'Please configure SERIES_API_KEY and SERIES_API_BASE_URL environment variables',
      });
    }

    const { phone_number, page, per_page } = req.query;
    const response = await apiClient.listChats({
      phoneNumber: phone_number,
      page: page ? parseInt(page) : undefined,
      perPage: per_page ? parseInt(per_page) : undefined,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(error.status || 500).json({
      error: 'Failed to fetch chats',
      message: error.message,
      details: error.data,
    });
  }
});

// ==================== Profile Endpoints ====================

/**
 * Save user profile
 * POST /api/profiles
 * Body: { phoneNumber: string, profile: object }
 */
app.post('/api/profiles', async (req, res) => {
  try {
    const { phoneNumber, profile } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'phoneNumber is required',
      });
    }

    if (!profile) {
      return res.status(400).json({
        error: 'profile data is required',
      });
    }

    // Save profile to DynamoDB
    const savedProfile = await db.saveProfile(phoneNumber, { profile });

    res.json({
      success: true,
      message: 'Profile saved successfully',
      data: savedProfile,
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({
      error: 'Failed to save profile',
      message: error.message,
    });
  }
});

/**
 * Get user profile by phone number
 * GET /api/profiles/:phoneNumber
 */
app.get('/api/profiles/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const profile = await db.getProfile(phoneNumber);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        phoneNumber,
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message,
    });
  }
});

/**
 * Get all profiles
 * GET /api/profiles
 */
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await db.getAllProfiles();

    res.json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error('Error getting profiles:', error);
    res.status(500).json({
      error: 'Failed to get profiles',
      message: error.message,
    });
  }
});

/**
 * Delete user profile
 * DELETE /api/profiles/:phoneNumber
 */
app.delete('/api/profiles/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    await db.deleteProfile(phoneNumber);

    res.json({
      success: true,
      message: 'Profile deleted successfully',
      phoneNumber,
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      error: 'Failed to delete profile',
      message: error.message,
    });
  }
});

// ==================== Matching Endpoints ====================

/**
 * Get compatible matches for a user
 * GET /api/matches/:phoneNumber
 * Query params: limit (default: 10), minScore (default: 30)
 */
app.get('/api/matches/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const minScore = parseInt(req.query.minScore) || 30;

    const matches = await db.findMatches(phoneNumber, limit, minScore);

    res.json({
      success: true,
      phoneNumber,
      count: matches.length,
      matches,
    });
  } catch (error) {
    console.error('Error finding matches:', error);

    if (error.message === 'User profile not found') {
      return res.status(404).json({
        error: 'User profile not found',
        phoneNumber: req.params.phoneNumber,
      });
    }

    res.status(500).json({
      error: 'Failed to find matches',
      message: error.message,
    });
  }
});

// ==================== WebSocket Connection ====================

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  connectedClients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to iMessage listener',
    listening: isListening,
    timestamp: new Date().toISOString(),
  }));

  // Handle client messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'send_reply') {
        const { chatId, message: messageText } = data;
        
        if (!chatId || !messageText) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'chatId and message are required',
          }));
          return;
        }

        if (!apiClient) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'API client not initialized. Please configure API credentials.',
          }));
          return;
        }

        try {
          const response = await apiClient.createChatMessage(chatId, {
            message: {
              text: messageText,
            },
          });

          ws.send(JSON.stringify({
            type: 'reply_sent',
            success: true,
            data: {
              messageId: response.data.id,
              chatId: response.data.chat_id,
              text: response.data.text,
              sentAt: response.data.sent_at,
            },
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to send reply',
            error: error.message,
            details: error.data,
          }));
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  if (activeConsumer && isListening) {
    try {
      await activeConsumer.stop();
    } catch (error) {
      console.error('Error stopping consumer:', error);
    }
  }

  // Close all WebSocket connections
  connectedClients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Cloud Run

server.listen(PORT, HOST, () => {
  console.log(`🚀 iMessage API Server running on ${HOST}:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}`);
  console.log(`🌐 REST API: http://${HOST}:${PORT}/api`);
  console.log(`\n💡 Start the listener: POST http://${HOST}:${PORT}/api/listener/start`);
  
  // Log environment info
  console.log(`\n📋 Environment:`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${PORT}`);
  console.log(`   HOST: ${HOST}`);
});

module.exports = app;

