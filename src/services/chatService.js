const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { buildParticipantKey } = require('../utils/conversationKey');
const { sanitizeUser } = require('../utils/userPresenter');

const ensureParticipant = (conversation, userId) => {
  const isParticipant = conversation.participants.some(
    (participantId) => participantId.toString() === userId.toString()
  );

  if (!isParticipant) {
    throw new ApiError(403, 'You are not part of this conversation');
  }
};

const getOrCreateConversation = async (currentUserId, participantId) => {
  if (currentUserId.toString() === participantId.toString()) {
    throw new ApiError(400, 'Cannot start a conversation with yourself');
  }

  const participant = await User.findById(participantId);

  if (!participant || !participant.isActive) {
    throw new ApiError(404, 'Participant not found');
  }

  const participantKey = buildParticipantKey(currentUserId, participantId);

  let conversation = await Conversation.findOne({ participantKey }).populate(
    'participants',
    'name email avatarUrl isOnline lastSeenAt'
  );

  if (!conversation) {
    conversation = await Conversation.create({
      participantKey,
      participants: [currentUserId, participantId],
    });

    conversation = await conversation.populate(
      'participants',
      'name email avatarUrl isOnline lastSeenAt'
    );
  }

  return conversation;
};

const listConversations = async (currentUserId) => {
  const conversations = await Conversation.find({
    participants: currentUserId,
  })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name email avatarUrl isOnline lastSeenAt');

  return conversations.map((conversation) => {
    const otherUser = conversation.participants.find(
      (participant) => participant._id.toString() !== currentUserId.toString()
    );

    return {
      id: conversation._id,
      participant: otherUser ? sanitizeUser(otherUser) : null,
      lastMessageText: conversation.lastMessageText,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageSenderId: conversation.lastMessageSenderId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  });
};

const getConversationById = async (currentUserId, conversationId) => {
  const conversation = await Conversation.findById(conversationId).populate(
    'participants',
    'name email avatarUrl isOnline lastSeenAt'
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  ensureParticipant(conversation, currentUserId);

  const otherUser = conversation.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString()
  );

  return {
    id: conversation._id,
    participant: otherUser ? sanitizeUser(otherUser) : null,
    lastMessageText: conversation.lastMessageText,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const listMessages = async (currentUserId, conversationId, { page = 1, limit = 30 }) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  ensureParticipant(conversation, currentUserId);

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatarUrl')
      .populate('receiverId', 'name avatarUrl'),
    Message.countDocuments({ conversationId }),
  ]);

  return {
    messages: messages.reverse().map((message) => ({
      id: message._id,
      conversationId: message.conversationId,
      senderId: message.senderId?._id || message.senderId,
      receiverId: message.receiverId?._id || message.receiverId,
      sender: message.senderId,
      receiver: message.receiverId,
      type: message.type,
      content: message.content,
      mediaUrl: message.mediaUrl,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const createMessage = async (
  currentUserId,
  conversationId,
  { content, type = 'text', mediaUrl = '' }
) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  ensureParticipant(conversation, currentUserId);

  const receiverId = conversation.participants.find(
    (participantId) => participantId.toString() !== currentUserId.toString()
  );

  const message = await Message.create({
    conversationId,
    senderId: currentUserId,
    receiverId,
    type,
    content,
    mediaUrl,
  });

  conversation.lastMessageText = type === 'text' ? content : `[${type}]`;
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessageSenderId = currentUserId;
  await conversation.save();

  return message.populate([
    { path: 'senderId', select: 'name avatarUrl' },
    { path: 'receiverId', select: 'name avatarUrl' },
  ]);
};

const markMessagesAsRead = async (currentUserId, conversationId) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  ensureParticipant(conversation, currentUserId);

  const now = new Date();

  await Message.updateMany(
    {
      conversationId,
      receiverId: currentUserId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: now,
    }
  );

  return { conversationId, readAt: now };
};

module.exports = {
  getOrCreateConversation,
  listConversations,
  getConversationById,
  listMessages,
  createMessage,
  markMessagesAsRead,
  ensureParticipant,
};
