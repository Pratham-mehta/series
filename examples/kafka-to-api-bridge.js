require('dotenv').config();
const KafkaConsumer = require('../kafka/consumer');
const SeriesAPIClient = require('../api/client');

/**
 * Kafka to API Bridge
 * Consumes messages from Kafka and makes API calls based on the requests
 */
class KafkaToAPIBridge {
  constructor() {
    this.consumer = new KafkaConsumer();
    this.apiClient = null;
  }

  async initialize() {
    // Initialize API client if we have the base URL
    const apiBaseURL = process.env.SERIES_API_BASE_URL;
    const apiKey = process.env.SERIES_API_KEY;

    if (apiBaseURL && apiKey) {
      this.apiClient = new SeriesAPIClient({
        baseURL: apiBaseURL,
        apiKey: apiKey,
      });
      console.log('✅ API client initialized');
    } else {
      console.log('⚠️  API client not initialized - SERIES_API_BASE_URL not set');
      console.log('   Will only log Kafka messages, not make API calls');
    }

    // Register handler for API request events
    this.consumer.onEvent('api.request', async (eventData) => {
      await this.handleAPIRequest(eventData);
    });

    // Also handle message.received events from Series
    this.consumer.onEvent('message.received', async (eventData) => {
      console.log('\n💬 Received message from Series:');
      const msg = eventData.data;
      console.log(`   From: ${msg.from_phone}`);
      console.log(`   Text: ${msg.text}`);
      console.log(`   Chat ID: ${msg.chat_id}`);
    });
  }

  async handleAPIRequest(eventData) {
    const { data } = eventData;
    const method = data.method;
    const endpoint = data.endpoint;
    const queryParams = data.query_params || {};

    console.log(`\n🔗 Processing API Request:`);
    console.log(`   Method: ${method}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Query Params:`, queryParams);

    if (!this.apiClient) {
      console.log('   ⚠️  Cannot process - API client not initialized');
      return;
    }

    try {
      let response;

      // Handle different API endpoints
      if (method === 'GET' && endpoint === '/api/chats') {
        response = await this.apiClient.listChats({
          phoneNumber: queryParams.phone_number,
          page: queryParams.page || 1,
          perPage: queryParams.per_page || 25,
        });

        console.log(`\n✅ API Call Successful:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Chats Found: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
        console.log(`\n📋 Response Data:`);
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log(`   ⚠️  Unsupported endpoint: ${method} ${endpoint}`);
      }
    } catch (error) {
      console.error(`\n❌ API Call Failed:`);
      console.error(`   Error: ${error.message}`);
      if (error.status) {
        console.error(`   Status: ${error.status}`);
      }
      if (error.data) {
        console.error(`   Details:`, JSON.stringify(error.data, null, 2));
      }
    }
  }

  async start() {
    try {
      await this.initialize();
      await this.consumer.connect();
      await this.consumer.start();

      console.log('\n🚀 Kafka to API Bridge is running...');
      console.log('   Listening for API requests and Series messages');
      console.log('   Press Ctrl+C to stop\n');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down...');
        await this.consumer.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n\n🛑 Shutting down...');
        await this.consumer.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('\n❌ Error starting bridge:', error.message);
      await this.consumer.stop().catch(() => {});
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const bridge = new KafkaToAPIBridge();
  bridge.start();
}

module.exports = KafkaToAPIBridge;

