const agoraService = require('../services/agoraService');

const generateToken = async (req, res) => {
  const payload = agoraService.generateRtcToken(req.body);
  res.status(200).json({ success: true, data: payload });
};

const getAgoraConfig = async (_req, res) => {
  const env = require('../config/env');
  res.status(200).json({
    success: true,
    data: {
      appId: env.agora.appId,
    },
  });
};

module.exports = {
  generateToken,
  getAgoraConfig,
};
