const KafkaConsumer = require('../kafka/consumer');
const SeriesAPIClient = require('../api/client');
const readline = require('readline');

/**
 * Listen for iMessage messages and allow sending replies
 * This creates an interactive terminal where you can see incoming messages
 * and type replies
 * 
 * Usage: node examples/listen-and-reply.js
 */
async function listenAndReply() {
  // Use unique consumer group to avoid conflicts
  process.env.KAFKA_USE_UNIQUE_GROUP = 'true';

  const consumer = new KafkaConsumer();
  const apiClient = new SeriesAPIClient();
  
  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let currentChatId = null;
  let currentFromPhone = null;

  console.log('🔊 Starting iMessage Listener with Reply Capability...');
  console.log('📱 Listening for messages on Kafka topic...\n');
  console.log('💡 Commands:');
  console.log('   - Type a message and press Enter to reply to the last received message');
  console.log('   - Type "exit" or "quit" to stop\n');
  console.log('='.repeat(60) + '\n');

  // Register handler for message.received events
  consumer.onEvent('message.received', async (eventData) => {
    const { data } = eventData;
    
    currentChatId = data.chat_id;
    currentFromPhone = data.from_phone;
    
    console.log('\n' + '='.repeat(60));
    console.log('📱 NEW iMESSAGE RECEIVED');
    console.log('='.repeat(60));
    console.log(`📞 From: ${data.from_phone || 'Unknown'}`);
    console.log(`💬 Message: ${data.text || '(no text)'}`);
    console.log(`🆔 Chat ID: ${data.chat_id || 'Unknown'}`);
    console.log(`📅 Sent At: ${data.sent_at || 'Unknown'}`);
    console.log('='.repeat(60));
    console.log('\n💬 Type your reply (or "exit" to quit):');
  });

  // Register handler for typing indicators
  consumer.onEvent('typing_indicator.received', async (eventData) => {
    const { data } = eventData;
    console.log(`\n⌨️  [TYPING] Chat ${data.chat_id || 'Unknown'} - Someone is typing...`);
  });

  consumer.onEvent('typing_indicator.removed', async (eventData) => {
    const { data } = eventData;
    console.log(`\n⌨️  [STOPPED] Chat ${data.chat_id || 'Unknown'} - Typing stopped`);
  });

  // Handle user input for replies
  rl.on('line', async (input) => {
    const message = input.trim();

    if (!message) {
      return;
    }

    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
      console.log('\n🛑 Shutting down...');
      await consumer.stop();
      rl.close();
      process.exit(0);
    }

    if (!currentChatId) {
      console.log('❌ No message received yet. Please wait for a message first.\n');
      return;
    }

    try {
      console.log(`\n📤 Sending reply to chat ${currentChatId}...`);
      
      const response = await apiClient.createChatMessage(currentChatId, {
        message: {
          text: message,
        },
      });

      console.log('✅ Reply sent successfully!');
      console.log(`   Message ID: ${response.data.id}`);
      console.log(`   Sent to: ${currentFromPhone || 'Unknown'}\n`);
      console.log('💬 Waiting for next message... (or type "exit" to quit)\n');
    } catch (error) {
      console.error('\n❌ Error sending reply:');
      console.error(`   Status: ${error.status}`);
      console.error(`   Message: ${error.message}`);
      if (error.data) {
        console.error(`   Details:`, JSON.stringify(error.data, null, 2));
      }
      console.log('\n💬 Try again or type "exit" to quit\n');
    }
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
      rl.close();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down listener...');
      await consumer.stop();
      rl.close();
      console.log('✅ Disconnected. Goodbye!');
      process.exit(0);
    });

    console.log('💡 Waiting for messages... (Type "exit" to stop)\n');
  } catch (error) {
    console.error('\n❌ Error starting listener:', error.message);
    if (error.message && error.message.includes('incompatible')) {
      console.error('\n💡 Tip: If you see protocol incompatibility errors,');
      console.error('   wait a few minutes or use a different consumer group.\n');
    }
    rl.close();
    await consumer.stop().catch(() => {});
    process.exit(1);
  }
}

// Run the listener
if (require.main === module) {
  listenAndReply();
}

module.exports = listenAndReply;

