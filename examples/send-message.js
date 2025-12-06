const KafkaProducer = require('../kafka/producer');

/**
 * Example: Send a message to Kafka topic
 */
async function sendMessage() {
  const producer = new KafkaProducer();

  try {
    // Connect to Kafka
    await producer.connect();

    // Example 1: Send a simple test message
    console.log('\n📤 Sending test message...');
    const testMessage = {
      event: 'test_message',
      data: {
        message: 'Hello from Series 2.0!',
        timestamp: new Date().toISOString(),
        source: 'nodejs-producer',
      },
    };

    await producer.sendMessage(testMessage);

    // Example 2: Send a message that matches the Series API format
    console.log('\n📤 Sending Series API format message...');
    const seriesMessage = {
      api_version: 'v2',
      created_at: new Date().toISOString(),
      data: {
        text: 'This is a test message from the Kafka producer',
        chat_id: '12345',
        from_phone: '+1234567890',
        is_read: false,
        attachments: [],
      },
      event_id: `test-${Date.now()}`,
      event_type: 'message.received',
    };

    await producer.sendMessage(seriesMessage);

    // Example 3: Send a batch of messages
    console.log('\n📤 Sending batch of messages...');
    const batchMessages = [
      { event: 'batch_test_1', data: { message: 'Batch message 1' } },
      { event: 'batch_test_2', data: { message: 'Batch message 2' } },
      { event: 'batch_test_3', data: { message: 'Batch message 3' } },
    ];

    await producer.sendBatch(batchMessages);

    console.log('\n✅ All messages sent successfully!');

    // Disconnect
    await producer.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await producer.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  sendMessage();
}

module.exports = sendMessage;

