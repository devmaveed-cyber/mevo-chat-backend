const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Mevo Chat API is healthy',
    });
  });

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
