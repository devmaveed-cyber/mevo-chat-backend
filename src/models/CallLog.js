const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'rejected', 'missed', 'ended', 'cancelled'],
      default: 'ringing',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSec: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallLog', callLogSchema);
