const SeriesAPIClient = require('../api/client');
const { ReactionTypes, ReactionOperations } = require('../api/schemas');

/**
 * Example usage of Series iMessage Service API
 */
async function apiExamples() {
  // Initialize the API client
  // Credentials are loaded from environment variables:
  // SERIES_API_BASE_URL and SERIES_API_KEY
  const client = new SeriesAPIClient();

  try {
    // ==================== Example 1: Create a Chat and Send Message ====================
    console.log('\n📱 Example 1: Creating a chat and sending initial message...');
    
    const createChatPayload = {
      send_from: '+16463458837', // Your sender number
      chat: {
        phone_numbers: ['+19176256109'], // Recipient phone number
        display_name: 'Test Contact', // Optional display name
      },
      message: {
        text: 'Hello from Series 2.0 API!',
      },
    };

    const chatResponse = await client.createChat(createChatPayload);
    console.log('✅ Chat created:', chatResponse.data);
    const chatId = chatResponse.data.id;

    // ==================== Example 2: Send Additional Messages ====================
    console.log('\n📱 Example 2: Sending additional message to chat...');
    
    const messagePayload = {
      message: {
        text: 'This is a follow-up message!',
      },
    };

    const messageResponse = await client.createChatMessage(chatId, messagePayload);
    console.log('✅ Message sent:', messageResponse.data);

    // ==================== Example 3: List Chats ====================
    console.log('\n📱 Example 3: Listing all chats...');
    
    const chatsResponse = await client.listChats({
      page: 1,
      perPage: 25,
    });
    console.log('✅ Chats retrieved:', chatsResponse.data);

    // ==================== Example 4: Get Chat Details ====================
    console.log('\n📱 Example 4: Getting chat details...');
    
    const chatDetails = await client.getChat(chatId);
    console.log('✅ Chat details:', chatDetails.data);

    // ==================== Example 5: List Messages in Chat ====================
    console.log('\n📱 Example 5: Listing messages in chat...');
    
    const messagesResponse = await client.listChatMessages(chatId);
    console.log('✅ Messages:', messagesResponse.data);

    // ==================== Example 6: React to a Message ====================
    if (messagesResponse.data && messagesResponse.data.length > 0) {
      console.log('\n📱 Example 6: Reacting to a message...');
      
      const firstMessage = messagesResponse.data[0];
      const reactionPayload = {
        operation: ReactionOperations.ADD,
        type: ReactionTypes.LIKE,
      };

      const reactionResponse = await client.reactToMessage(firstMessage.id, reactionPayload);
      console.log('✅ Reaction added:', reactionResponse.data);
    }

    // ==================== Example 7: Typing Indicators ====================
    console.log('\n📱 Example 7: Starting typing indicator...');
    await client.startTyping(chatId);
    console.log('✅ Typing indicator started');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📱 Stopping typing indicator...');
    await client.stopTyping(chatId);
    console.log('✅ Typing indicator stopped');

    // ==================== Example 8: Mark Chat as Read ====================
    console.log('\n📱 Example 8: Marking chat as read...');
    await client.markChatAsRead(chatId);
    console.log('✅ Chat marked as read');

    // ==================== Example 9: Edit a Message ====================
    if (messagesResponse.data && messagesResponse.data.length > 0) {
      console.log('\n📱 Example 9: Editing a message...');
      
      const messageToEdit = messagesResponse.data[0];
      const editPayload = {
        text: 'This message has been edited!',
      };

      // Note: Messages can only be edited within 15 minutes of creation
      try {
        const editResponse = await client.editChatMessage(chatId, messageToEdit.id, editPayload);
        console.log('✅ Message edited:', editResponse.data);
      } catch (error) {
        console.log('⚠️  Could not edit message (may be outside 15-minute window):', error.message);
      }
    }

    // ==================== Example 10: Check iMessage Availability ====================
    console.log('\n📱 Example 10: Checking iMessage availability...');
    
    const availabilityPayload = {
      phone_number: '+19176256109',
    };

    const availabilityResponse = await client.checkIMessageAvailability(availabilityPayload);
    console.log('✅ iMessage availability:', availabilityResponse.data);

    // ==================== Example 11: Find Chat ====================
    console.log('\n📱 Example 11: Finding chat by phone number...');
    
    const findResponse = await client.findChat({
      phoneNumber: '+19176256109',
    });
    console.log('✅ Found chat:', findResponse.data);

    console.log('\n✅ All API examples completed successfully!');

  } catch (error) {
    console.error('\n❌ API Error:', error.message);
    if (error.status) {
      console.error('   Status:', error.status);
    }
    if (error.data) {
      console.error('   Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Run examples if called directly
if (require.main === module) {
  apiExamples();
}

module.exports = apiExamples;

