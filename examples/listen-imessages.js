const KafkaConsumer = require('../kafka/consumer');

/**
 * Listen for iMessage messages from Kafka topic
 * Displays all incoming messages with phone numbers and content
 * 
 * Usage: node examples/listen-imessages.js
 */
async function listenToIMessages() {
  // Use unique consumer group to avoid conflicts
  process.env.KAFKA_USE_UNIQUE_GROUP = 'true';

  const consumer = new KafkaConsumer();

  console.log('🔊 Starting iMessage Listener...');
  console.log('📱 Listening for messages on Kafka topic...\n');

  // Register handler for message.received events
  consumer.onEvent('message.received', async (eventData) => {
    const { data } = eventData;
    
    console.log('\n' + '='.repeat(60));
    console.log('📱 NEW iMESSAGE');
    console.log('='.repeat(60));
    console.log(`📞 From: ${data.from_phone || 'Unknown'}`);
    console.log(`💬 Message: ${data.text || '(no text)'}`);
    console.log(`🆔 Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`📅 Sent At: ${data.sent_at || 'Unknown'}`);
    console.log(`📲 Service: ${data.service || 'Unknown'}`);
    console.log(`👁️  Read: ${data.is_read ? 'Yes' : 'No'}`);
    
    if (data.chat_handles && data.chat_handles.length > 0) {
      console.log(`👥 Participants:`);
      data.chat_handles.forEach(handle => {
        const isMe = handle.is_me ? ' (You)' : '';
        console.log(`   - ${handle.display_name || handle.identifier}${isMe}`);
      });
    }
    
    if (data.attachments && data.attachments.length > 0) {
      console.log(`📎 Attachments: ${data.attachments.length} file(s)`);
      data.attachments.forEach((att, idx) => {
        console.log(`   ${idx + 1}. ${att.filename || att.url || 'Unknown file'}`);
      });
    }
    
    if (data.reaction_id) {
      console.log(`😀 Reaction: ${data.reaction_id}`);
    }
    
    console.log('='.repeat(60) + '\n');
  });

  // Register handler for typing indicators
  consumer.onEvent('typing_indicator.received', async (eventData) => {
    const { data } = eventData;
    console.log(`⌨️  [TYPING] Chat ${data.chat_id || 'Unknown'} - Someone is typing...`);
  });

  consumer.onEvent('typing_indicator.removed', async (eventData) => {
    const { data } = eventData;
    console.log(`⌨️  [STOPPED] Chat ${data.chat_id || 'Unknown'} - Typing stopped`);
  });

  try {
    // Connect to Kafka
    await consumer.connect();
    console.log('✅ Connected to Kafka cluster');
    console.log(`📥 Listening on topic: ${consumer.topicName}`);
    console.log(`👥 Consumer Group: ${consumer.consumerGroup}\n`);

    // Start consuming messages
    await consumer.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down listener...');
      await consumer.stop();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down listener...');
      await consumer.stop();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    console.log('💡 Waiting for messages... (Press Ctrl+C to stop)\n');
  } catch (error) {
    console.error('\n❌ Error starting listener:', error.message);
    if (error.message && error.message.includes('incompatible')) {
      console.error('\n💡 Tip: If you see protocol incompatibility errors,');
      console.error('   wait a few minutes or use a different consumer group.\n');
    }
    await consumer.stop().catch(() => {});
    process.exit(1);
  }
}

// Run the listener
if (require.main === module) {
  listenToIMessages();
}

module.exports = listenToIMessages;

