const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Format structured error logging
  logger.error(err.message || 'Server Error', {
    actor_id: req.user ? req.user._id.toString() : 'anonymous',
    action: `${req.method} ${req.originalUrl}`,
    status: statusCode,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
