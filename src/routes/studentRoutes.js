const express = require('express');
const router = express.Router();
const {
  getStudents,
  getMyStudentReport,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  publishReportCard,
  unpublishReportCard
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect); // All student routes require auth

router.route('/')
  .get(authorize('admin', 'faculty'), getStudents)
  .post(authorize('admin'), createStudent);

router.get('/me', authorize('student'), getMyStudentReport);

router.route('/:id')
  .get(authorize('admin', 'faculty', 'student'), getStudentById)
  .put(authorize('admin'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

router.patch('/:id/publish', authorize('admin'), publishReportCard);
router.patch('/:id/unpublish', authorize('admin'), unpublishReportCard);

module.exports = router;
