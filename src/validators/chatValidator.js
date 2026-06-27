const { body, param, query } = require('express-validator');

const startConversationRules = [
  body('participantId').isMongoId().withMessage('Valid participant id is required'),
];

const sendMessageRules = [
  param('conversationId').isMongoId().withMessage('Valid conversation id is required'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'audio', 'video'])
    .withMessage('Invalid message type'),
];

const conversationIdRules = [
  param('conversationId').isMongoId().withMessage('Valid conversation id is required'),
];

const listMessagesRules = [
  param('conversationId').isMongoId().withMessage('Valid conversation id is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
];

module.exports = {
  startConversationRules,
  sendMessageRules,
  conversationIdRules,
  listMessagesRules,
};
