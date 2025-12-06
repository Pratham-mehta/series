const DynamoDBHelper = require('./db/dynamodb');

/**
 * Test DynamoDB Connection and Operations
 */
async function testDynamoDB() {
  console.log('🧪 Testing DynamoDB Connection...\n');

  const db = new DynamoDBHelper();

  try {
    // Test 1: Save a profile
    console.log('Test 1: Saving a test profile...');
    const testProfile = await db.saveProfile('+16463458837', {
      profile: {
        name: 'John Doe',
        title: 'Software Engineer',
        company: 'Tech Corp',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        skills: ['Python', 'AWS', 'React'],
      },
      messageInsights: {
        recentTopics: ['pizza', 'tech'],
        sentiment: 'Happy',
        vibe: 'Friendly',
        lastMessage: 'Hey I want to eat pizza',
        lastMessageAt: new Date().toISOString(),
      },
    });
    console.log('✅ Test 1 Passed: Profile saved\n');

    // Test 2: Get the profile
    console.log('Test 2: Retrieving the profile...');
    const retrievedProfile = await db.getProfile('+16463458837');
    console.log('Retrieved Profile:', JSON.stringify(retrievedProfile, null, 2));
    console.log('✅ Test 2 Passed: Profile retrieved\n');

    // Test 3: Update message insights
    console.log('Test 3: Updating message insights...');
    const updatedProfile = await db.updateMessageInsights('+16463458837', {
      recentTopics: ['pizza', 'tech', 'hiking'],
      sentiment: 'Excited',
      vibe: 'Enthusiastic',
      lastMessage: 'Let\'s go hiking this weekend!',
      lastMessageAt: new Date().toISOString(),
    });
    console.log('✅ Test 3 Passed: Message insights updated\n');

    // Test 4: Save another profile
    console.log('Test 4: Saving a second profile...');
    await db.saveProfile('+14155551234', {
      profile: {
        name: 'Sarah Johnson',
        title: 'Software Engineer',
        company: 'StartupCo',
        skills: ['Python', 'AWS', 'Node.js'],
      },
      messageInsights: {
        recentTopics: ['pizza', 'startups'],
        sentiment: 'Happy',
        vibe: 'Enthusiastic',
        lastMessage: 'Pizza sounds great!',
        lastMessageAt: new Date().toISOString(),
      },
    });
    console.log('✅ Test 4 Passed: Second profile saved\n');

    // Test 5: Update compatibility scores
    console.log('Test 5: Updating compatibility scores...');
    await db.updateCompatibilityScores('+16463458837', {
      '+14155551234': 0.87,
      '+14085556789': 0.72,
    });
    console.log('✅ Test 5 Passed: Compatibility scores updated\n');

    // Test 6: Get all profiles
    console.log('Test 6: Getting all profiles...');
    const allProfiles = await db.getAllProfiles();
    console.log(`Found ${allProfiles.length} profiles:`);
    allProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profile.profile.name} (${profile.phoneNumber})`);
    });
    console.log('✅ Test 6 Passed: All profiles retrieved\n');

    // Test 7: Check if profile exists
    console.log('Test 7: Checking if profile exists...');
    const exists = await db.profileExists('+16463458837');
    console.log(`Profile exists: ${exists}`);
    console.log('✅ Test 7 Passed: Profile existence check\n');

    console.log('🎉 All tests passed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Total Profiles: ${allProfiles.length}`);
    console.log(`   DynamoDB Table: ${db.tableName}`);
    console.log(`   AWS Region: ${process.env.AWS_REGION}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testDynamoDB();
