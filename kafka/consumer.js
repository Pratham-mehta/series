const { getKafkaInstance, getTopicName, getConsumerGroup, validateConfig } = require('./config');
const axios = require('axios');
const DynamoDBHelper = require('../db/dynamodb');
const SeriesAPIClient = require('../api/client');

/**
 * Kafka Consumer for receiving messages from the topic
 * Handles message.received, typing_indicator.received, and typing_indicator.removed events
 */
class KafkaConsumer {
  constructor() {
    this.consumer = null;
    this.topicName = null;
    this.consumerGroup = null;
    this.isRunning = false;
    this.messageHandlers = new Map();
    this.db = new DynamoDBHelper();
    this.empathyLambdaUrl = process.env.EMPATHY_LAMBDA_URL;

    // Initialize API client for sending replies
    try {
      this.apiClient = new SeriesAPIClient();
    } catch (error) {
      console.warn('⚠️  API client not initialized:', error.message);
      this.apiClient = null;
    }
  }

  /**
   * Initialize and connect the consumer
   */
  async connect() {
    try {
      validateConfig();
      const kafka = getKafkaInstance();
      this.topicName = getTopicName();
      this.consumerGroup = getConsumerGroup();
      
      // Create a unique client ID to avoid conflicts with other consumers
      const uniqueClientId = `${process.env.KAFKA_CLIENT_ID || 'series-client'}-${Date.now()}`;
      
      this.consumer = kafka.consumer({
        groupId: this.consumerGroup,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxInFlightRequests: 1,
        rebalanceTimeout: 60000, // Increased rebalance timeout
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
        // Force protocol compatibility
        allowAutoTopicCreation: false,
      });

      await this.consumer.connect();
      console.log('✅ Kafka consumer connected successfully');
      console.log(`   Consumer Group: ${this.consumerGroup}`);
      console.log(`   Topic: ${this.topicName}`);
      return true;
    } catch (error) {
      console.error('❌ Error connecting Kafka consumer:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to the topic
   */
  async subscribe() {
    if (!this.consumer) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    try {
      await this.consumer.subscribe({
        topic: this.topicName,
        fromBeginning: false, // Start from latest messages
      });
      console.log(`📥 Subscribed to topic: ${this.topicName}`);
    } catch (error) {
      console.error('❌ Error subscribing to topic:', error.message);
      throw error;
    }
  }

  /**
   * Register a handler for a specific event type
   * @param {String} eventType - Event type (e.g., 'message.received', 'typing_indicator.received')
   * @param {Function} handler - Handler function that receives the event data
   */
  onEvent(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.messageHandlers.set(eventType, handler);
    console.log(`📌 Registered handler for event: ${eventType}`);
  }

  /**
   * Process a Kafka message
   * @param {Object} message - Kafka message object
   */
  async processMessage(message) {
    try {
      const messageValue = message.value.toString();
      let eventData;

      // Try to parse as JSON
      try {
        eventData = JSON.parse(messageValue);
      } catch (e) {
        // If not JSON, treat as plain text
        eventData = {
          event_type: 'unknown',
          data: { text: messageValue },
        };
      }

      const eventType = eventData.event_type || 'unknown';
      const eventId = eventData.event_id || 'unknown';
      const createdAt = eventData.created_at || new Date().toISOString();

      console.log(`\n📨 Received event: ${eventType}`);
      console.log(`   Event ID: ${eventId}`);
      console.log(`   Created At: ${createdAt}`);

      // Call registered handler if exists
      const handler = this.messageHandlers.get(eventType);
      if (handler) {
        try {
          await handler(eventData);
        } catch (handlerError) {
          console.error(`❌ Error in handler for ${eventType}:`, handlerError.message);
        }
      } else {
        // Default handler - just log the data
        console.log('   Data:', JSON.stringify(eventData.data, null, 2));
      }

      // Handle specific event types
      switch (eventType) {
        case 'message.received':
          this.handleMessageReceived(eventData);
          break;
        case 'message.sent':
          // Handle messages we sent (for confirmation)
          this.handleMessageReceived(eventData);
          break;
        case 'typing_indicator.received':
          this.handleTypingIndicatorReceived(eventData);
          break;
        case 'typing_indicator.removed':
          this.handleTypingIndicatorRemoved(eventData);
          break;
        default:
          console.log(`   Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error.message);
    }
  }

  /**
   * Call Empathy Lambda to analyze message sentiment
   * @param {String} messageText - The message text
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeMessageSentiment(messageText) {
    try {
      if (!this.empathyLambdaUrl) {
        console.log('⚠️  Empathy Lambda URL not configured, skipping sentiment analysis');
        return null;
      }

      console.log('🤖 Calling Empathy Lambda...');
      const response = await axios.post(this.empathyLambdaUrl, {
        message: messageText
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      // Parse the response body (Lambda returns JSON string in body)
      const result = typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data;

      console.log('✅ Sentiment analysis:', result);
      return result;
    } catch (error) {
      console.error('❌ Error calling Empathy Lambda:', error.message);
      return null;
    }
  }

  /**
   * Extract topics/keywords from message text
   * @param {String} messageText - The message text
   * @returns {Array<String>} List of topics
   */
  extractTopics(messageText) {
    if (!messageText) return [];

    // Simple keyword extraction (you can make this more sophisticated)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'want', 'hey', 'looking', 'great', 'here']);

    // Convert to lowercase and split into words
    const words = messageText.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 3) // Only words longer than 3 chars
      .filter(word => !commonWords.has(word)); // Remove common words

    // Return unique topics, limit to 5
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Update user's message insights in DynamoDB
   * @param {String} phoneNumber - User's phone number
   * @param {String} messageText - The message text
   * @param {Object} sentimentData - Sentiment analysis from Lambda
   */
  async updateMessageInsights(phoneNumber, messageText, sentimentData) {
    try {
      // Extract topics from message
      const topics = this.extractTopics(messageText);

      // Get existing profile or create new insights
      const profile = await this.db.getProfile(phoneNumber);

      if (!profile) {
        console.log(`⚠️  No profile found for ${phoneNumber}, skipping insights update`);
        return;
      }

      // Merge new topics with existing ones (keep last 10 unique topics)
      const existingTopics = profile.messageInsights?.recentTopics || [];
      const allTopics = [...new Set([...topics, ...existingTopics])].slice(0, 10);

      // Build updated insights
      const insights = {
        recentTopics: allTopics,
        sentiment: sentimentData?.sentiment || 'Neutral',
        vibe: sentimentData?.vibe_color || null,
        lastMessage: messageText,
        lastMessageAt: new Date().toISOString()
      };

      // Update DynamoDB
      await this.db.updateMessageInsights(phoneNumber, insights);
      console.log(`✅ Updated message insights for ${phoneNumber}`);
      console.log(`   Topics: ${allTopics.join(', ')}`);
      console.log(`   Sentiment: ${insights.sentiment}`);
    } catch (error) {
      console.error('❌ Error updating message insights:', error.message);
    }
  }

  /**
   * Send an auto-reply to a chat
   * @param {String} chatId - Chat ID to reply to
   * @param {String} replyText - Text to send
   */
  async sendReply(chatId, replyText) {
    if (!this.apiClient) {
      console.log('⚠️  Cannot send reply - API client not initialized');
      return null;
    }

    try {
      console.log(`\n📤 Sending auto-reply to chat ${chatId}...`);

      const response = await this.apiClient.createChatMessage(chatId, {
        message: {
          text: replyText,
        },
      });

      console.log('✅ Auto-reply sent successfully!');
      console.log(`   Message ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending auto-reply:', error.message);
      return null;
    }
  }

  /**
   * Generate an auto-reply based on message content and sentiment
   * @param {String} messageText - The received message text
   * @param {Object} sentimentData - Sentiment analysis data
   * @param {String} fromPhone - Sender's phone number
   * @returns {String} Auto-reply text
   */
  async generateAutoReply(messageText, sentimentData, fromPhone) {
    // Get user profile to check for matches
    const profile = await this.db.getProfile(fromPhone);

    if (!profile || !profile.messageInsights) {
      // Simple acknowledgment for unknown users
      return `Thanks for your message! I received: "${messageText}"`;
    }

    // Use Lambda's suggestion if available
    if (sentimentData && sentimentData.suggestion) {
      // If Lambda provided a specific suggestion/vibe, use it to craft response
      const suggestion = sentimentData.suggestion;

      if (typeof suggestion === 'string') {
        // Lambda gave us a direct suggestion
        return `Thanks for reaching out! ${suggestion}`;
      } else if (suggestion.vibe) {
        // Lambda provided vibe information
        return `I appreciate your ${suggestion.vibe.toLowerCase()} message! Let me help you with that.`;
      }
    }

    // Use sentiment-based responses
    const sentiment = sentimentData?.sentiment || 'Neutral';
    const vibe = sentimentData?.vibe;

    if (sentiment === 'Happy' || vibe === 'Celebratory' || vibe === 'Cheerful') {
      return `Great to hear from you! Your positive energy is contagious! 😊`;
    } else if (sentiment === 'Sad') {
      return `I'm here for you. Thanks for reaching out. 💙`;
    } else if (vibe && vibe.includes('Playful')) {
      return `Hey! I love your energy! Let me help you find someone who shares your interests! 😊`;
    }

    // Default response
    return `Thanks for your message! I'm processing it and will help you connect with the right people.`;
  }

  /**
   * Handle message.received event
   * @param {Object} eventData - Event data
   */
  async handleMessageReceived(eventData) {
    const { data } = eventData;
    console.log(`\n💬 New Message Received:`);
    console.log(`   From: ${data.from_phone || 'Unknown'}`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Text: ${data.text || '(no text)'}`);
    console.log(`   Read: ${data.is_read ? 'Yes' : 'No'}`);
    if (data.attachments && data.attachments.length > 0) {
      console.log(`   Attachments: ${data.attachments.length}`);
    }

    // IMPORTANT: Skip messages from our own number to avoid infinite loops
    const myNumber = process.env.SENDER_NUMBER || '+16463458837';
    if (data.from_phone === myNumber) {
      console.log('   ⏭️  Skipping - this is our own message');
      return;
    }

    // Process message for insights (Phase 3)
    if (data.text && data.from_phone) {
      console.log('\n🔄 Processing message for insights...');

      // 1. Call Empathy Lambda for sentiment analysis
      const sentimentData = await this.analyzeMessageSentiment(data.text);

      // 2. Update DynamoDB with message insights
      await this.updateMessageInsights(data.from_phone, data.text, sentimentData);

      // 3. Generate and send auto-reply
      if (data.chat_id && this.apiClient) {
        const replyText = await this.generateAutoReply(data.text, sentimentData, data.from_phone);
        await this.sendReply(data.chat_id, replyText);
      }
    }
  }

  /**
   * Handle typing_indicator.received event
   * @param {Object} eventData - Event data
   */
  handleTypingIndicatorReceived(eventData) {
    const { data } = eventData;
    console.log(`\n⌨️  Typing Indicator:`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Display: ${data.display ? 'Yes' : 'No'}`);
    console.log(`   Timestamp: ${data.timestamp || 'Unknown'}`);
  }

  /**
   * Handle typing_indicator.removed event
   * @param {Object} eventData - Event data
   */
  handleTypingIndicatorRemoved(eventData) {
    const { data } = eventData;
    console.log(`\n⌨️  Typing Stopped:`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Display: ${data.display ? 'Yes' : 'No'}`);
    console.log(`   Timestamp: ${data.timestamp || 'Unknown'}`);
  }

  /**
   * Start consuming messages
   */
  async start() {
    if (!this.consumer) {
      throw new Error('Consumer not connected. Call connect() first.');
    }

    if (this.isRunning) {
      console.log('⚠️  Consumer is already running');
      return;
    }

    try {
      await this.subscribe();
      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.processMessage(message);
        },
      });

      console.log('🚀 Consumer started and listening for messages...');
    } catch (error) {
      this.isRunning = false;
      
      // Handle protocol incompatibility error
      if (error.message && error.message.includes('incompatible')) {
        console.error('\n❌ Consumer group protocol incompatibility detected.');
        console.error('   This usually happens when other consumers are using different KafkaJS versions.');
        console.error('\n💡 Solutions:');
        console.error('   1. Wait a few minutes for existing consumers to disconnect');
        console.error('   2. Use a unique consumer group ID for testing (update .env)');
        console.error('   3. Ensure all consumers use the same KafkaJS version');
        console.error('\n   Attempting to disconnect and retry...\n');
        
        // Try to disconnect and wait before retrying
        try {
          await this.consumer.disconnect();
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          console.log('   Retrying connection...');
          await this.consumer.connect();
          await this.subscribe();
          await this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
              await this.processMessage(message);
            },
          });
          console.log('✅ Consumer reconnected successfully!');
          return;
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError.message);
        }
      }
      
      console.error('❌ Error starting consumer:', error.message);
      throw error;
    }
  }

  /**
   * Stop consuming messages and disconnect
   */
  async stop() {
    if (this.consumer && this.isRunning) {
      try {
        await this.consumer.disconnect();
        this.isRunning = false;
        console.log('✅ Kafka consumer disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting consumer:', error.message);
        throw error;
      }
    }
  }
}

module.exports = KafkaConsumer;

