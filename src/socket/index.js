const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const chatService = require('../services/chatService');
const SOCKET_EVENTS = require('../constants/socketEvents');

const onlineUsers = new Map();

const serializeMessage = (message) => ({
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
});

const registerChatSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.jwt.secret);
      const user = await User.findById(decoded.sub).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      lastSeenAt: new Date(),
    });

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload, callback) => {
      try {
        const { conversationId, content, type = 'text', mediaUrl = '' } = payload || {};

        if (!conversationId || !content?.trim()) {
          throw new Error('conversationId and content are required');
        }

        const message = await chatService.createMessage(userId, conversationId, {
          content: content.trim(),
          type,
          mediaUrl,
        });

        const serialized = serializeMessage(message);
        const receiverId = serialized.receiverId.toString();

        io.to(userId).emit(SOCKET_EVENTS.MESSAGE_SENT, serialized);

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, serialized);
        }

        if (typeof callback === 'function') {
          callback({ success: true, data: serialized });
        }
      } catch (error) {
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    socket.on(SOCKET_EVENTS.MESSAGE_READ, async (payload) => {
      try {
        const { conversationId } = payload || {};
        if (!conversationId) return;

        const result = await chatService.markMessagesAsRead(userId, conversationId);

        const conversation = await chatService.getConversationById(userId, conversationId);
        const otherUserId = conversation.participant?.id?.toString();

        if (otherUserId) {
          const otherSocketId = onlineUsers.get(otherUserId);
          if (otherSocketId) {
            io.to(otherSocketId).emit(SOCKET_EVENTS.MESSAGE_READ, {
              conversationId,
              readBy: userId,
              readAt: result.readAt,
            });
          }
        }
      } catch {
        // ignore invalid read events
      }
    });

    socket.on(SOCKET_EVENTS.TYPING, (payload) => {
      const { conversationId, receiverId } = payload || {};
      if (!receiverId) return;

      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit(SOCKET_EVENTS.TYPING, {
          conversationId,
          userId,
        });
      }
    });

    socket.on(SOCKET_EVENTS.STOP_TYPING, (payload) => {
      const { conversationId, receiverId } = payload || {};
      if (!receiverId) return;

      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit(SOCKET_EVENTS.STOP_TYPING, {
          conversationId,
          userId,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CALL_INVITE, (payload) => {
      const { receiverId, call } = payload || {};
      if (!receiverId || !call) return;

      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit(SOCKET_EVENTS.CALL_INVITE, {
          ...call,
          caller: {
            id: socket.user._id,
            name: socket.user.name,
            avatarUrl: socket.user.avatarUrl,
          },
        });
      }
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPT, (payload) => {
      const { callerId, call } = payload || {};
      if (!callerId || !call) return;

      const callerSocketId = onlineUsers.get(callerId.toString());
      if (callerSocketId) {
        io.to(callerSocketId).emit(SOCKET_EVENTS.CALL_ACCEPT, call);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_REJECT, (payload) => {
      const { callerId, call } = payload || {};
      if (!callerId || !call) return;

      const callerSocketId = onlineUsers.get(callerId.toString());
      if (callerSocketId) {
        io.to(callerSocketId).emit(SOCKET_EVENTS.CALL_REJECT, call);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_CANCEL, (payload) => {
      const { receiverId, call } = payload || {};
      if (!receiverId || !call) return;

      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit(SOCKET_EVENTS.CALL_CANCEL, call);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_END, (payload) => {
      const { peerId, call } = payload || {};
      if (!peerId || !call) return;

      const peerSocketId = onlineUsers.get(peerId.toString());
      if (peerSocketId) {
        io.to(peerSocketId).emit(SOCKET_EVENTS.CALL_END, call);
      }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeenAt: new Date(),
      });

      socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
        userId,
        lastSeenAt: new Date(),
      });
    });
  });
};

module.exports = registerChatSocket;
