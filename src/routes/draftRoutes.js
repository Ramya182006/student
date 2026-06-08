const express = require('express');
const router = express.Router();
const { saveDraft, getDraft, deleteDraft } = require('../controllers/draftController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Requires authentication

router.route('/')
  .post(saveDraft)
  .get(getDraft)
  .delete(deleteDraft);

module.exports = router;
