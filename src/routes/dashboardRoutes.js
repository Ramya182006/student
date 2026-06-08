const express = require('express');
const router = express.Router();
const { getKPIs } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/kpis', protect, authorize('admin', 'faculty', 'student'), getKPIs);

module.exports = router;
