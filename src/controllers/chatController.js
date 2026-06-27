const chatService = require('../services/chatService');

const startConversation = async (req, res) => {
  const conversation = await chatService.getOrCreateConversation(
    req.user._id,
    req.body.participantId
  );

  res.status(200).json({ success: true, data: conversation });
};

const listConversations = async (req, res) => {
  const conversations = await chatService.listConversations(req.user._id);
  res.status(200).json({ success: true, data: conversations });
};

const getConversation = async (req, res) => {
  const conversation = await chatService.getConversationById(
    req.user._id,
    req.params.conversationId
  );
  res.status(200).json({ success: true, data: conversation });
};

const listMessages = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;

  const result = await chatService.listMessages(
    req.user._id,
    req.params.conversationId,
    { page, limit }
  );

  res.status(200).json({ success: true, data: result });
};

const sendMessage = async (req, res) => {
  const message = await chatService.createMessage(
    req.user._id,
    req.params.conversationId,
    req.body
  );

  res.status(201).json({ success: true, data: message });
};

const markAsRead = async (req, res) => {
  const result = await chatService.markMessagesAsRead(
    req.user._id,
    req.params.conversationId
  );

  res.status(200).json({ success: true, data: result });
};

module.exports = {
  startConversation,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  markAsRead,
};
