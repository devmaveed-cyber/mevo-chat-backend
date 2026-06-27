const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessageText: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
