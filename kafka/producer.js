const { getKafkaInstance, getTopicName, validateConfig } = require('./config');

/**
 * Kafka Producer for sending messages to the topic
 */
class KafkaProducer {
  constructor() {
    this.producer = null;
    this.topicName = null;
  }

  /**
   * Initialize and connect the producer
   */
  async connect() {
    try {
      validateConfig();
      const kafka = getKafkaInstance();
      this.topicName = getTopicName();
      this.producer = kafka.producer();

      await this.producer.connect();
      console.log('✅ Kafka producer connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Error connecting Kafka producer:', error.message);
      throw error;
    }
  }

  /**
   * Send a message to the Kafka topic
   * @param {Object} message - The message object to send
   * @param {Object} options - Optional parameters (partition, key, headers, etc.)
   * @returns {Promise<Object>} - Record metadata
   */
  async sendMessage(message, options = {}) {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    try {
      const messageValue = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);

      const record = {
        topic: this.topicName,
        messages: [
          {
            value: messageValue,
            key: options.key || null,
            partition: options.partition || null,
            headers: options.headers || {},
            timestamp: options.timestamp || Date.now().toString(),
          },
        ],
      };

      const result = await this.producer.send(record);
      
      // Handle kafkajs response structure
      if (result && Array.isArray(result) && result.length > 0) {
        const metadata = result[0];
        if (metadata && metadata.partitions && metadata.partitions.length > 0) {
          console.log('📤 Message sent successfully:');
          console.log(`   Topic: ${metadata.topicName || metadata.topic}`);
          console.log(`   Partition: ${metadata.partitions[0].partition}`);
          console.log(`   Offset: ${metadata.partitions[0].offset}`);
        }
        return metadata;
      } else if (result) {
        // Handle different response structures
        console.log('📤 Message sent successfully');
        return result;
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      throw error;
    }
  }

  /**
   * Send multiple messages in a batch
   * @param {Array} messages - Array of message objects
   * @returns {Promise<Object>} - Record metadata
   */
  async sendBatch(messages) {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        value: typeof msg === 'string' ? msg : JSON.stringify(msg),
        key: msg.key || null,
        partition: msg.partition || null,
        headers: msg.headers || {},
      }));

      const result = await this.producer.send({
        topic: this.topicName,
        messages: formattedMessages,
      });

      console.log(`📤 Batch of ${messages.length} messages sent successfully`);
      return result;
    } catch (error) {
      console.error('❌ Error sending batch:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect the producer
   */
  async disconnect() {
    if (this.producer) {
      try {
        await this.producer.disconnect();
        console.log('✅ Kafka producer disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting producer:', error.message);
        throw error;
      }
    }
  }
}

module.exports = KafkaProducer;

