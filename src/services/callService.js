const crypto = require('crypto');
const CallLog = require('../models/CallLog');
const ApiError = require('../utils/ApiError');
const chatService = require('./chatService');

const buildChannelName = (callerId, receiverId) => {
  const hash = crypto
    .createHash('sha256')
    .update(`${callerId}:${receiverId}:${Date.now()}`)
    .digest('hex')
    .slice(0, 24);

  return `mevo_${hash}`;
};

const initiateCall = async (callerId, { receiverId, callType }) => {
  const conversation = await chatService.getOrCreateConversation(
    callerId,
    receiverId
  );

  const channelName = buildChannelName(callerId, receiverId);

  const callLog = await CallLog.create({
    conversationId: conversation.id || conversation._id,
    callerId,
    receiverId,
    channelName,
    callType,
    status: 'ringing',
  });

  return {
    call: callLog,
    conversationId: conversation.id || conversation._id,
    channelName,
  };
};

const updateCallStatus = async (currentUserId, { callId, status }) => {
  const callLog = await CallLog.findById(callId);

  if (!callLog) {
    throw new ApiError(404, 'Call not found');
  }

  const isParticipant =
    callLog.callerId.toString() === currentUserId.toString() ||
    callLog.receiverId.toString() === currentUserId.toString();

  if (!isParticipant) {
    throw new ApiError(403, 'You are not part of this call');
  }

  const now = new Date();
  callLog.status = status;

  if (status === 'accepted' && !callLog.answeredAt) {
    callLog.answeredAt = now;
  }

  if (['ended', 'rejected', 'missed', 'cancelled'].includes(status)) {
    callLog.endedAt = now;

    if (callLog.answeredAt) {
      callLog.durationSec = Math.max(
        0,
        Math.floor((now.getTime() - callLog.answeredAt.getTime()) / 1000)
      );
    }
  }

  await callLog.save();
  return callLog;
};

const listCallHistory = async (currentUserId) => {
  const calls = await CallLog.find({
    $or: [{ callerId: currentUserId }, { receiverId: currentUserId }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('callerId', 'name avatarUrl')
    .populate('receiverId', 'name avatarUrl');

  return calls.map((call) => ({
    id: call._id,
    conversationId: call.conversationId,
    callerId: call.callerId?._id || call.callerId,
    receiverId: call.receiverId?._id || call.receiverId,
    caller: call.callerId,
    receiver: call.receiverId,
    channelName: call.channelName,
    callType: call.callType,
    status: call.status,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    durationSec: call.durationSec,
    createdAt: call.createdAt,
  }));
};

module.exports = {
  initiateCall,
  updateCallStatus,
  listCallHistory,
};
