/**
 * Series iMessage Service API - Request/Response Schemas
 * Based on OpenAPI 3.0 specification
 */

/**
 * Chat Message Attachment Schema
 */
const ChatMessageAttachment = {
  filename: String,      // Required
  mime_type: String,     // Required
  data_base64: String,   // Required - base64 encoded file data (no data URI prefix)
};

/**
 * Chat Messages Create Payload
 */
const ChatMessagesCreateJSONPayload = {
  message: {
    text: String,        // Required, cannot be empty string
    attachments: [ChatMessageAttachment], // Optional
  },
};

/**
 * Chats Create Payload
 */
const ChatsCreatePayload = {
  send_from: String,     // Required - E.164 phone format
  chat: {
    phone_numbers: [String], // Required, min 1
    display_name: String,    // Optional
  },
  message: {
    text: String,        // Required, cannot be empty string
  },
};

/**
 * Reaction Payload
 */
const ReactionPayload = {
  operation: String,     // Required - enum: 'add' | 'remove'
  type: String,          // Required - enum: 'love' | 'like' | 'dislike' | 'laugh' | 'emphasize' | 'question'
};

/**
 * iMessage Availability Check Payload
 */
const IMessageAvailabilityCheckPayload = {
  phone_number: String,  // Required - phone number to check
};

/**
 * List Chats Query Parameters
 */
const ListChatsQueryParams = {
  phone_number: String,  // Optional - filter by participant phone (E.164)
  page: Number,          // Optional - default 1, min 1
  per_page: Number,     // Optional - default 25, max 100
};

/**
 * Find Chat Query Parameters
 */
const FindChatQueryParams = {
  phone_number: String,  // Optional - primary phone
  phone_numbers: [String], // Optional - additional phones to match
};

/**
 * Reaction Types
 */
const ReactionTypes = {
  LOVE: 'love',
  LIKE: 'like',
  DISLIKE: 'dislike',
  LAUGH: 'laugh',
  EMPHASIZE: 'emphasize',
  QUESTION: 'question',
};

/**
 * Reaction Operations
 */
const ReactionOperations = {
  ADD: 'add',
  REMOVE: 'remove',
};

module.exports = {
  ChatMessageAttachment,
  ChatMessagesCreateJSONPayload,
  ChatsCreatePayload,
  ReactionPayload,
  IMessageAvailabilityCheckPayload,
  ListChatsQueryParams,
  FindChatQueryParams,
  ReactionTypes,
  ReactionOperations,
};

