const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFaculty,
  bulkAssignClassSubjects
} = require('../controllers/subjectController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect); // All subject routes require auth

router.route('/')
  .get(authorize('admin', 'faculty'), getSubjects)
  .post(authorize('admin'), createSubject);

router.post('/bulk-assign', authorize('admin'), bulkAssignClassSubjects);

router.route('/:id')
  .get(authorize('admin', 'faculty'), getSubjectById)
  .put(authorize('admin'), updateSubject)
  .delete(authorize('admin'), deleteSubject);

router.patch('/:id/assign-faculty', authorize('admin'), assignFaculty);

module.exports = router;
