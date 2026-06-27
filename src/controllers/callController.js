const callService = require('../services/callService');

const initiateCall = async (req, res) => {
  const payload = await callService.initiateCall(req.user._id, req.body);
  res.status(201).json({ success: true, data: payload });
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
  updateCallStatus,
  listCallHistory,
};
