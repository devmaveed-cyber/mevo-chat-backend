const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'AGORA_APP_ID', 'AGORA_APP_CERTIFICATE'];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

module.exports = {
  port: Number(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  agora: {
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
    tokenExpirySeconds: Number(process.env.AGORA_TOKEN_EXPIRY_SECONDS) || 3600,
  },
};
