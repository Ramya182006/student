const logger = require('../config/logger');
const metricsService = require('../services/metricsService');

const latencyTracker = (req, res, next) => {
  const start = process.hrtime();

  // Snapshot ALL req values synchronously BEFORE the async 'finish' event.
  // Inside 'finish', req properties (body, params, user) may already be
  // garbage-collected / undefined, crashing the server.
  const snapBody       = req.body   || {};
  const snapParams     = req.params || {};
  const snapBodySid    = snapBody.student_id || snapBody.studentId || null;
  const snapParamId    = snapParams.studentId || snapParams.id || null;
  const snapMethod     = req.method || 'UNKNOWN';
  const snapOrigUrl    = req.originalUrl || '';
  const snapBaseUrl    = req.baseUrl || '';
  const snapPath       = req.path || '/';

  res.on('finish', () => {
    try {
      const diff    = process.hrtime(start);
      const latency = parseFloat(((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2));

      // req.user is set by authMiddleware AFTER this middleware runs — still safe here
      const actor_id = (req.user && req.user._id) ? req.user._id.toString() : 'anonymous';

      let student_id = snapParamId || snapBodySid || null;
      if (!student_id && req.user && req.user.role === 'student') {
        student_id = req.user._id.toString();
      }

      const routePath = req.route ? req.route.path : null;
      const action    = req.action || `${snapMethod} ${routePath || snapOrigUrl}`;

      logger.info('Request processed', {
        actor_id,
        student_id,
        action,
        status: res.statusCode,
        latency,
      });

      const operation = `${snapMethod} ${routePath || (snapBaseUrl + (snapPath === '/' ? '' : snapPath))}`;
      metricsService.recordRequest(operation, latency);
    } catch (err) {
      // Never let observability code crash the server
      logger.warn('latencyTracker finish handler error', { message: err.message });
    }
  });

  next();
};


module.exports = latencyTracker;
