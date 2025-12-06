require('dotenv').config();
const { Kafka } = require('kafkajs');

/**
 * Kafka Configuration for Confluent Cloud
 * All credentials are loaded from environment variables
 */
const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'series-client',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS || ''],
  ssl: process.env.KAFKA_TLS_ENABLED === 'true',
  sasl: {
    mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
    username: process.env.KAFKA_SASL_USERNAME || '',
    password: process.env.KAFKA_SASL_PASSWORD || '',
  },
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'KAFKA_BOOTSTRAP_SERVERS',
  'KAFKA_SASL_USERNAME',
  'KAFKA_SASL_PASSWORD',
  'KAFKA_TOPIC_NAME',
  'KAFKA_CONSUMER_GROUP',
];

function validateConfig() {
  const missing = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or set these variables.'
    );
  }
}

// Create Kafka instance
let kafkaInstance = null;

function getKafkaInstance() {
  if (!kafkaInstance) {
    validateConfig();
    kafkaInstance = new Kafka(kafkaConfig);
  }
  return kafkaInstance;
}

// Export configuration and helper functions
module.exports = {
  kafkaConfig,
  getKafkaInstance,
  validateConfig,
  getTopicName: () => process.env.KAFKA_TOPIC_NAME,
  getConsumerGroup: () => {
    // Allow override with unique consumer group for testing
    if (process.env.KAFKA_USE_UNIQUE_GROUP === 'true') {
      return `${process.env.KAFKA_CONSUMER_GROUP}-${Date.now()}`;
    }
    return process.env.KAFKA_CONSUMER_GROUP;
  },
  getClientId: () => process.env.KAFKA_CLIENT_ID || kafkaConfig.clientId,
};

