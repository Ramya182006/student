const express = require('express');
const router = express.Router();
const {
  createMarkEntry,
  updateMarkEntry,
  getMarkEntries,
  deleteMarkEntry
} = require('../controllers/markEntryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect); // All routes require auth

router.route('/')
  .get(authorize('admin', 'faculty'), getMarkEntries)
  .post(authorize('admin', 'faculty'), createMarkEntry);

router.route('/:id')
  .put(authorize('admin', 'faculty'), updateMarkEntry)
  .delete(authorize('admin'), deleteMarkEntry);

module.exports = router;
