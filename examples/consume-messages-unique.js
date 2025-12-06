const KafkaConsumer = require('../kafka/consumer');

/**
 * Example: Consume messages with a unique consumer group
 * This avoids protocol incompatibility issues when other consumers are active
 * 
 * Usage: KAFKA_USE_UNIQUE_GROUP=true node examples/consume-messages-unique.js
 */
async function consumeMessages() {
  // Set unique group flag if not already set
  if (!process.env.KAFKA_USE_UNIQUE_GROUP) {
    process.env.KAFKA_USE_UNIQUE_GROUP = 'true';
  }

  const consumer = new KafkaConsumer();

  // Register custom handlers for specific event types
  consumer.onEvent('message.received', async (eventData) => {
    const { data } = eventData;
    console.log('\n📱 ===== NEW iMESSAGE RECEIVED =====');
    console.log(`   From: ${data.from_phone || 'Unknown'}`);
    console.log(`   Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`   Message: ${data.text || '(no text)'}`);
    console.log(`   Sent At: ${data.sent_at || 'Unknown'}`);
    console.log(`   Service: ${data.service || 'Unknown'}`);
    if (data.chat_handles && data.chat_handles.length > 0) {
      console.log(`   Participants: ${data.chat_handles.map(h => h.display_name || h.identifier).join(', ')}`);
    }
    if (data.attachments && data.attachments.length > 0) {
      console.log(`   Attachments: ${data.attachments.length} file(s)`);
    }
    console.log('=====================================\n');
  });

  consumer.onEvent('typing_indicator.received', async (eventData) => {
    const { data } = eventData;
    console.log(`\n⌨️  [TYPING] Chat ${data.chat_id || 'Unknown'} - Someone is typing...`);
  });

  consumer.onEvent('typing_indicator.removed', async (eventData) => {
    const { data } = eventData;
    console.log(`\n⌨️  [STOPPED TYPING] Chat ${data.chat_id || 'Unknown'}`);
  });

  try {
    // Connect to Kafka
    await consumer.connect();

    // Start consuming messages
    await consumer.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down consumer...');
      await consumer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down consumer...');
      await consumer.stop();
      process.exit(0);
    });

    // Keep the process alive
    console.log('\n💡 Press Ctrl+C to stop the consumer\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await consumer.stop().catch(() => {});
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  consumeMessages();
}

module.exports = consumeMessages;

