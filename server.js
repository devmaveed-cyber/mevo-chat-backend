require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const registerChatSocket = require('./src/socket');

const startServer = async () => {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.clientOrigin === '*' ? true : env.clientOrigin,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  registerChatSocket(io);

  server.listen(env.port, () => {
    console.log(`Mevo Chat backend running on port ${env.port} [${env.nodeEnv}]`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
