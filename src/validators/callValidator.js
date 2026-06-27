const { body } = require('express-validator');

const generateTokenRules = [
  body('channelName').trim().notEmpty().withMessage('channelName is required'),
  body('uid').isInt({ min: 0 }).withMessage('uid must be a non-negative integer'),
  body('role')
    .optional()
    .isIn(['publisher', 'subscriber'])
    .withMessage('role must be publisher or subscriber'),
];

const initiateCallRules = [
  body('receiverId').isMongoId().withMessage('Valid receiver id is required'),
  body('callType')
    .isIn(['audio', 'video'])
    .withMessage('callType must be audio or video'),
];

const updateCallStatusRules = [
  body('callId').isMongoId().withMessage('Valid call id is required'),
  body('status')
    .isIn(['accepted', 'rejected', 'ended', 'cancelled', 'missed'])
    .withMessage('Invalid call status'),
];

module.exports = {
  generateTokenRules,
  initiateCallRules,
  updateCallStatusRules,
};
