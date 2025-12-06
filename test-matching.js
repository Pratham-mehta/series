const DynamoDBHelper = require('./db/dynamodb');

async function setupTestData() {
  const db = new DynamoDBHelper();

  try {
    console.log('📝 Setting up test data for matching...\n');

    // Update friend's profile with message insights
    await db.updateMessageInsights('+15713659116', {
      recentTopics: ['pizza', 'hiking', 'travel', 'music'],
      sentiment: 'Happy',
      vibe: 'Green',
      lastMessage: 'I love pizza and hiking on weekends!',
      lastMessageAt: '2025-12-06T09:00:00.000Z',
    });
    console.log('✅ Updated insights for +15713659116');

    // Update Alice's profile with similar interests
    await db.updateMessageInsights('+11234567890', {
      recentTopics: ['pizza', 'javascript', 'coding', 'travel'],
      sentiment: 'Happy',
      vibe: 'Green',
      lastMessage: 'Anyone want to grab pizza and talk about code?',
      lastMessageAt: '2025-12-06T09:05:00.000Z',
    });
    console.log('✅ Updated insights for +11234567890 (Alice)');

    // Update Bob's profile with different interests
    await db.updateMessageInsights('+19876543210', {
      recentTopics: ['python', 'cloud', 'devops', 'deployment'],
      sentiment: 'Neutral',
      vibe: 'Blue',
      lastMessage: 'Working on AWS deployment scripts today',
      lastMessageAt: '2025-12-06T09:10:00.000Z',
    });
    console.log('✅ Updated insights for +19876543210 (Bob)');

    console.log('\n✨ Test data setup complete!\n');

    // Now test the matching
    console.log('🔍 Finding matches for +15713659116 (your friend)...\n');
    const matches = await db.findMatches('+15713659116', 10, 20);

    console.log(`Found ${matches.length} matches:\n`);
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.name} (${match.phoneNumber})`);
      console.log(`   Score: ${match.compatibilityScore}/100`);
      console.log(`   Reason: ${match.reason}`);
      if (match.sharedTopics.length > 0) {
        console.log(`   Shared Topics: ${match.sharedTopics.join(', ')}`);
      }
      if (match.sharedSkills.length > 0) {
        console.log(`   Shared Skills: ${match.sharedSkills.join(', ')}`);
      }
      console.log(`   Breakdown: Topics(${Math.round(match.breakdown.topicScore)}), Sentiment(${Math.round(match.breakdown.sentimentScore)}), Profile(${Math.round(match.breakdown.profileScore)})`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTestData();
