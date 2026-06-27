const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const agoraController = require('../controllers/agoraController');
const callController = require('../controllers/callController');
const { registerRules, loginRules } = require('../validators/authValidator');
const {
  startConversationRules,
  sendMessageRules,
  conversationIdRules,
  listMessagesRules,
} = require('../validators/chatValidator');
const {
  generateTokenRules,
  initiateCallRules,
  updateCallStatusRules,
} = require('../validators/callValidator');

const router = express.Router();

router.post(
  '/auth/register',
  registerRules,
  validate,
  asyncHandler(authController.register)
);

router.post(
  '/auth/login',
  loginRules,
  validate,
  asyncHandler(authController.login)
);

router.get('/auth/me', protect, asyncHandler(authController.getMe));
router.post('/auth/logout', protect, asyncHandler(authController.logout));

router.get('/users/search', protect, asyncHandler(userController.searchUsers));
router.get('/users/:id', protect, asyncHandler(userController.getUserById));
router.patch('/users/me', protect, asyncHandler(userController.updateProfile));

router.get('/agora/config', protect, asyncHandler(agoraController.getAgoraConfig));
router.post(
  '/agora/token',
  protect,
  generateTokenRules,
  validate,
  asyncHandler(agoraController.generateToken)
);

router.get('/conversations', protect, asyncHandler(chatController.listConversations));
router.post(
  '/conversations',
  protect,
  startConversationRules,
  validate,
  asyncHandler(chatController.startConversation)
);
router.get(
  '/conversations/:conversationId',
  protect,
  conversationIdRules,
  validate,
  asyncHandler(chatController.getConversation)
);
router.get(
  '/conversations/:conversationId/messages',
  protect,
  listMessagesRules,
  validate,
  asyncHandler(chatController.listMessages)
);
router.post(
  '/conversations/:conversationId/messages',
  protect,
  sendMessageRules,
  validate,
  asyncHandler(chatController.sendMessage)
);
router.patch(
  '/conversations/:conversationId/read',
  protect,
  conversationIdRules,
  validate,
  asyncHandler(chatController.markAsRead)
);

router.get('/calls/history', protect, asyncHandler(callController.listCallHistory));
router.post(
  '/calls/initiate',
  protect,
  initiateCallRules,
  validate,
  asyncHandler(callController.initiateCall)
);
router.patch(
  '/calls/status',
  protect,
  updateCallStatusRules,
  validate,
  asyncHandler(callController.updateCallStatus)
);

module.exports = router;
