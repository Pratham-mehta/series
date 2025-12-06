require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

/**
 * DynamoDB Helper for UserProfiles Table
 */
class DynamoDBHelper {
  constructor() {
    // Create DynamoDB client
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Create Document Client (easier to work with JS objects)
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'UserProfiles';
  }

  /**
   * Create or update a user profile
   * @param {String} phoneNumber - User's phone number (primary key)
   * @param {Object} profileData - Profile data object
   * @returns {Promise<Object>}
   */
  async saveProfile(phoneNumber, profileData) {
    try {
      const timestamp = new Date().toISOString();

      const item = {
        phoneNumber,
        profile: profileData.profile || {},
        messageInsights: profileData.messageInsights || {
          recentTopics: [],
          sentiment: null,
          vibe: null,
          lastMessage: null,
          lastMessageAt: null,
        },
        compatibilityScores: profileData.compatibilityScores || {},
        createdAt: profileData.createdAt || timestamp,
        updatedAt: timestamp,
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
      });

      await this.docClient.send(command);
      console.log(`✅ Profile saved for ${phoneNumber}`);
      return item;
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      throw error;
    }
  }

  /**
   * Get a user profile by phone number
   * @param {String} phoneNumber - User's phone number
   * @returns {Promise<Object|null>}
   */
  async getProfile(phoneNumber) {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { phoneNumber },
      });

      const response = await this.docClient.send(command);
      return response.Item || null;
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Update message insights for a user
   * @param {String} phoneNumber - User's phone number
   * @param {Object} insights - Message insights object
   * @returns {Promise<Object>}
   */
  async updateMessageInsights(phoneNumber, insights) {
    try {
      const timestamp = new Date().toISOString();

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { phoneNumber },
        UpdateExpression: 'SET messageInsights = :insights, updatedAt = :timestamp',
        ExpressionAttributeValues: {
          ':insights': insights,
          ':timestamp': timestamp,
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.docClient.send(command);
      console.log(`✅ Message insights updated for ${phoneNumber}`);
      return response.Attributes;
    } catch (error) {
      console.error('❌ Error updating message insights:', error);
      throw error;
    }
  }

  /**
   * Update compatibility scores for a user
   * @param {String} phoneNumber - User's phone number
   * @param {Object} scores - Compatibility scores object { "+1234567890": 0.87 }
   * @returns {Promise<Object>}
   */
  async updateCompatibilityScores(phoneNumber, scores) {
    try {
      const timestamp = new Date().toISOString();

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { phoneNumber },
        UpdateExpression: 'SET compatibilityScores = :scores, updatedAt = :timestamp',
        ExpressionAttributeValues: {
          ':scores': scores,
          ':timestamp': timestamp,
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await this.docClient.send(command);
      console.log(`✅ Compatibility scores updated for ${phoneNumber}`);
      return response.Attributes;
    } catch (error) {
      console.error('❌ Error updating compatibility scores:', error);
      throw error;
    }
  }

  /**
   * Get all user profiles
   * @returns {Promise<Array>}
   */
  async getAllProfiles() {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const response = await this.docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error('❌ Error getting all profiles:', error);
      throw error;
    }
  }

  /**
   * Delete a user profile
   * @param {String} phoneNumber - User's phone number
   * @returns {Promise<void>}
   */
  async deleteProfile(phoneNumber) {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { phoneNumber },
      });

      await this.docClient.send(command);
      console.log(`✅ Profile deleted for ${phoneNumber}`);
    } catch (error) {
      console.error('❌ Error deleting profile:', error);
      throw error;
    }
  }

  /**
   * Check if profile exists
   * @param {String} phoneNumber - User's phone number
   * @returns {Promise<Boolean>}
   */
  async profileExists(phoneNumber) {
    try {
      const profile = await this.getProfile(phoneNumber);
      return profile !== null;
    } catch (error) {
      console.error('❌ Error checking profile existence:', error);
      throw error;
    }
  }

  /**
   * Calculate compatibility score between two users
   * @param {Object} user1 - First user's profile
   * @param {Object} user2 - Second user's profile
   * @returns {Object} - { score: number, sharedTopics: array, reason: string }
   */
  calculateCompatibility(user1, user2) {
    let score = 0;
    const breakdown = {
      topicScore: 0,
      sentimentScore: 0,
      profileScore: 0,
    };

    // 1. Shared Topics Score (40 points max)
    const topics1 = user1.messageInsights?.recentTopics || [];
    const topics2 = user2.messageInsights?.recentTopics || [];
    const sharedTopics = topics1.filter(topic => topics2.includes(topic));

    if (topics1.length > 0 && topics2.length > 0) {
      // Calculate Jaccard similarity for topics
      const allTopics = new Set([...topics1, ...topics2]);
      breakdown.topicScore = (sharedTopics.length / allTopics.size) * 40;
      score += breakdown.topicScore;
    }

    // 2. Sentiment Compatibility Score (30 points max)
    const sentiment1 = user1.messageInsights?.sentiment || 'Neutral';
    const sentiment2 = user2.messageInsights?.sentiment || 'Neutral';

    // Positive sentiments match well together
    const positiveSentiments = ['Happy', 'Neutral'];
    const negativeSentiments = ['Angry', 'Passive-Aggressive', 'Sad'];

    if (sentiment1 === sentiment2) {
      breakdown.sentimentScore = 30; // Perfect match
    } else if (
      (positiveSentiments.includes(sentiment1) && positiveSentiments.includes(sentiment2)) ||
      (negativeSentiments.includes(sentiment1) && negativeSentiments.includes(sentiment2))
    ) {
      breakdown.sentimentScore = 20; // Same category
    } else {
      breakdown.sentimentScore = 10; // Different categories
    }
    score += breakdown.sentimentScore;

    // 3. Profile Similarity Score (30 points max)
    const skills1 = user1.profile?.skills || [];
    const skills2 = user2.profile?.skills || [];
    const sharedSkills = skills1.filter(skill => skills2.includes(skill));

    if (skills1.length > 0 && skills2.length > 0) {
      const allSkills = new Set([...skills1, ...skills2]);
      breakdown.profileScore = (sharedSkills.length / allSkills.size) * 20;
    }

    // Company/Industry match bonus
    if (user1.profile?.company && user2.profile?.company) {
      if (user1.profile.company === user2.profile.company) {
        breakdown.profileScore += 10; // Same company bonus
      }
    }
    score += breakdown.profileScore;

    // Generate reason
    let reason = '';
    if (sharedTopics.length > 0) {
      reason = `Shared interests: ${sharedTopics.join(', ')}`;
    } else if (breakdown.sentimentScore >= 20) {
      reason = `Similar vibes (${sentiment1} & ${sentiment2})`;
    } else if (sharedSkills.length > 0) {
      reason = `Shared skills: ${sharedSkills.join(', ')}`;
    } else {
      reason = 'Potential connection based on profile';
    }

    return {
      score: Math.round(score),
      sharedTopics,
      sharedSkills,
      breakdown,
      reason,
    };
  }

  /**
   * Find compatible matches for a user
   * @param {String} phoneNumber - User's phone number
   * @param {Number} limit - Max number of matches to return (default: 10)
   * @param {Number} minScore - Minimum compatibility score (default: 30)
   * @returns {Promise<Array>} - Array of matches sorted by score
   */
  async findMatches(phoneNumber, limit = 10, minScore = 30) {
    try {
      // Get the user's profile
      const userProfile = await this.getProfile(phoneNumber);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get all other profiles
      const allProfiles = await this.getAllProfiles();
      const otherProfiles = allProfiles.filter(p => p.phoneNumber !== phoneNumber);

      // Calculate compatibility with each user
      const matches = otherProfiles.map(otherProfile => {
        const compatibility = this.calculateCompatibility(userProfile, otherProfile);

        return {
          phoneNumber: otherProfile.phoneNumber,
          name: otherProfile.profile?.name || 'Unknown',
          title: otherProfile.profile?.title || '',
          company: otherProfile.profile?.company || '',
          compatibilityScore: compatibility.score,
          sharedTopics: compatibility.sharedTopics,
          sharedSkills: compatibility.sharedSkills,
          breakdown: compatibility.breakdown,
          reason: compatibility.reason,
        };
      });

      // Filter by minimum score and sort by score (descending)
      const topMatches = matches
        .filter(match => match.compatibilityScore >= minScore)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, limit);

      console.log(`✅ Found ${topMatches.length} matches for ${phoneNumber}`);
      return topMatches;
    } catch (error) {
      console.error('❌ Error finding matches:', error);
      throw error;
    }
  }
}

module.exports = DynamoDBHelper;
