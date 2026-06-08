const express = require('express');
const router = express.Router();
const metricsService = require('../services/metricsService');

router.get('/', (req, res) => {
  res.json(metricsService.getMetrics());
});

module.exports = router;
