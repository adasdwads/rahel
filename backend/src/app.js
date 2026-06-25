const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { corsOrigins } = require('./config/env');

const app = express();

app.use((req, res, next) => {
  if (req.path === '/api/webhooks/civil-registry') {
    return next();
  }

  return express.json({ limit: '10mb' })(req, res, next);
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));

app.use('/api', routes);
app.use(errorHandler);

module.exports = app;