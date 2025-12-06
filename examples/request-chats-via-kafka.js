require('dotenv').config();
const KafkaProducer = require('../kafka/producer');

/**
 * Send a request message to Kafka asking for GET /api/chats
 * This message can be consumed by a service that will make the actual API call
 */
async function requestChatsViaKafka() {
  const producer = new KafkaProducer();
  const phoneNumber = process.argv[2] || '5713659116';

  try {
    // Format phone number to E.164
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+1${phoneNumber}`;

    console.log(`📤 Sending Kafka message to request chats for: ${formattedPhone}\n`);

    // Connect to Kafka
    await producer.connect();

    // Create a message requesting the API call
    const requestMessage = {
      api_version: 'v2',
      created_at: new Date().toISOString(),
      event_type: 'api.request',
      event_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        method: 'GET',
        endpoint: '/api/chats',
        query_params: {
          phone_number: formattedPhone,
        },
        request_id: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    };

    // Send the request message to Kafka
    const result = await producer.sendMessage(requestMessage);

    console.log('✅ Request message sent to Kafka successfully!');
    console.log(`\n📋 Message Details:`);
    if (result) {
      if (result.topicName || result.topic) {
        console.log(`   Topic: ${result.topicName || result.topic}`);
      }
      if (result.partitions && result.partitions.length > 0) {
        console.log(`   Partition: ${result.partitions[0].partition}`);
        console.log(`   Offset: ${result.partitions[0].offset}`);
      }
    }
    console.log(`\n📨 Request Payload:`);
    console.log(JSON.stringify(requestMessage, null, 2));
    console.log(`\n💡 This message can be consumed by a service that will make the API call to GET /api/chats`);

    // Disconnect
    await producer.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await producer.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  requestChatsViaKafka();
}

module.exports = requestChatsViaKafka;

