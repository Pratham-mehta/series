require('dotenv').config();
const SeriesAPIClient = require('../api/client');

/**
 * Get chats by phone number
 * Usage: node examples/get-chats.js [phone_number] [api_base_url] [api_key]
 */
async function getChats() {
  try {
    // Get phone number from command line or use default
    const phoneNumberArg = process.argv[2] || '5713659116';
    const apiBaseURL = process.argv[3] || process.env.SERIES_API_BASE_URL;
    const apiKey = process.argv[4] || process.env.SERIES_API_KEY;

    if (!apiBaseURL || !apiKey) {
      console.error('❌ Error: API credentials required!');
      console.error('\nUsage:');
      console.error('  node examples/get-chats.js [phone_number] [api_base_url] [api_key]');
      console.error('\nOr set environment variables:');
      console.error('  SERIES_API_BASE_URL=https://your-api-url.com');
      console.error('  SERIES_API_KEY=your-api-key');
      console.error('\nExample:');
      console.error('  node examples/get-chats.js 5713659116 https://api.example.com your-key');
      process.exit(1);
    }

    // Initialize API client with credentials
    const client = new SeriesAPIClient({
      baseURL: apiBaseURL,
      apiKey: apiKey,
    });

    // Phone number in E.164 format (add + prefix if not present)
    const phoneNumber = phoneNumberArg.startsWith('+') 
      ? phoneNumberArg 
      : `+1${phoneNumberArg}`;

    console.log(`📱 Fetching chats for phone number: ${phoneNumber}\n`);

    // Call GET /api/chats with phone_number query parameter
    const response = await client.listChats({
      phoneNumber: phoneNumber,
      page: 1,
      perPage: 100,
    });

    console.log('✅ Response Status:', response.status);
    console.log('\n📋 Chats:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status) {
      console.error('   Status Code:', error.status);
    }
    if (error.data) {
      console.error('   Error Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  getChats();
}

module.exports = getChats;

