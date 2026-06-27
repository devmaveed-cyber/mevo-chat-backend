const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const generateRtcToken = ({ channelName, uid, role = 'publisher' }) => {
  const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs =
    currentTimeInSeconds + env.agora.tokenExpirySeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      env.agora.appId,
      env.agora.appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    return {
      token,
      appId: env.agora.appId,
      channelName,
      uid,
      role: agoraRole === RtcRole.PUBLISHER ? 'publisher' : 'subscriber',
      expiresAt: privilegeExpiredTs,
    };
  } catch (error) {
    throw new ApiError(500, 'Failed to generate Agora token');
  }
};

module.exports = { generateRtcToken };
