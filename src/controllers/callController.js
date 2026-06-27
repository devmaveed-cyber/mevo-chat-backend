const callService = require('../services/callService');
const registerChatSocket = require('../socket');

const initiateCall = async (req, res) => {
  const payload = await callService.initiateCall(req.user._id, req.body);
  const callLog = payload.call;
  const invite = callService.buildCallInvitePayload(callLog, req.user);
  const inviteDelivered = await registerChatSocket.notifyCallInvite(
    req.body.receiverId,
    invite
  );

  res.status(201).json({
    success: true,
    data: {
      ...payload,
      inviteDelivered,
    },
  });
};

const getPendingCalls = async (req, res) => {
  const calls = await callService.getPendingIncomingCalls(req.user._id);
  res.status(200).json({ success: true, data: calls });
};

const updateCallStatus = async (req, res) => {
  const call = await callService.updateCallStatus(req.user._id, req.body);
  res.status(200).json({ success: true, data: call });
};

const listCallHistory = async (req, res) => {
  const calls = await callService.listCallHistory(req.user._id);
  res.status(200).json({ success: true, data: calls });
};

module.exports = {
  initiateCall,
  getPendingCalls,
  updateCallStatus,
  listCallHistory,
};
