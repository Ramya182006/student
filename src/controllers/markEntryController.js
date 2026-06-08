const MarkEntry = require('../models/markEntryModel');
const Subject = require('../models/subjectModel');
const Student = require('../models/studentModel');
const User = require('../models/userModel');
const ClassAssignment = require('../models/classAssignmentModel');
const { calculateGrade } = require('../utils/helpers');

/**
 * Helper function to verify if the actor has permission to edit marks for a subject
 * Admin has full access, Faculty is limited to assigned subjects.
 * @param {object} user - Authenticated user context
 * @param {string} subjectId - The subject ID to check
 * @returns {Promise<boolean>}
 */
const verifyFacultyAccess = async (user, subjectId, studentId = null) => {
  if (user.role === 'admin') return true;
  
  if (user.role === 'faculty') {
    const [subject, faculty] = await Promise.all([
      Subject.findById(subjectId),
      User.findById(user._id).select('department handledSections handledSubjects')
    ]);
    if (!subject) return false;
    
    // Check if the subject's assigned faculty matches the logged-in user
    if (subject.assignedFaculty && subject.assignedFaculty.toString() === user._id.toString()) {
      return true;
    }

    if (!studentId) {
      return ClassAssignment.exists({ faculty: user._id, subject: subjectId });
    }

    const student = await Student.findById(studentId).select('department semester section');
    if (!student) return false;

    const classAssignment = await ClassAssignment.exists({
      faculty: user._id,
      subject: subjectId,
      department: student.department,
      semester: student.semester,
      section: student.section
    });
    if (classAssignment) return true;

    return !!(
      faculty?.department === student.department &&
      faculty?.handledSections?.includes(student.section) &&
      faculty?.handledSubjects?.some((handledSubject) => handledSubject.toString() === subjectId.toString())
    );
  }
  
  return false;
};

/**
 * @desc    Create a Mark Entry
 * @route   POST /api/mark-entries
 * @access  Private (Admin, Faculty)
 */
const createMarkEntry = async (req, res, next) => {
  try {
    const { student_id, subject_id, internal_marks, external_marks } = req.body;

    if (!student_id || !subject_id || internal_marks === undefined || external_marks === undefined) {
      res.status(400);
      throw new Error('Please provide student_id, subject_id, internal_marks, and external_marks');
    }

    // Faculty check: can only edit/create for assigned subjects
    const hasAccess = await verifyFacultyAccess(req.user, subject_id, student_id);
    if (!hasAccess) {
      return res.status(403).json({
        message: 'Forbidden: Faculty can edit marks only for assigned subjects'
      });
    }

    // Verify student exists
    const studentExists = await Student.findById(student_id);
    if (!studentExists) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Check if MarkEntry already exists
    const duplicate = await MarkEntry.findOne({ student_id, subject_id });
    if (duplicate) {
      res.status(400);
      throw new Error('Mark entry already exists for this student and subject. Use PUT to update.');
    }

    // Marks boundary check (0 to 50 for internal and external)
    const intMarks = parseFloat(internal_marks);
    const extMarks = parseFloat(external_marks);
    if (intMarks < 0 || intMarks > 50 || extMarks < 0 || extMarks > 50) {
      res.status(400);
      throw new Error('Marks must be between 0 and 50');
    }

    const total = intMarks + extMarks;
    const grade = calculateGrade(total); // Done only on server

    const markEntry = await MarkEntry.create({
      student_id,
      subject_id,
      internal_marks: intMarks,
      external_marks: extMarks,
      total,
      grade,
      entered_by: req.user._id,
      updated_by: req.user._id,
      version: 1
    });

    const populatedEntry = await MarkEntry.findById(markEntry._id)
      .populate('student_id', 'name roll_no department semester isPublished')
      .populate('subject_id', 'name code')
      .populate('entered_by', 'name email role')
      .populate('updated_by', 'name email role');

    res.status(201).json(populatedEntry);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a Mark Entry (Supports Optimistic Concurrency)
 * @route   PUT /api/mark-entries/:id
 * @access  Private (Admin, Faculty)
 */
const updateMarkEntry = async (req, res, next) => {
  try {
    const markEntry = await MarkEntry.findById(req.params.id);
    if (!markEntry) {
      res.status(404);
      throw new Error('Mark entry not found');
    }

    // Faculty check: can only edit marks for assigned subjects
    const hasAccess = await verifyFacultyAccess(req.user, markEntry.subject_id, markEntry.student_id);
    if (!hasAccess) {
      return res.status(403).json({
        message: 'Forbidden: Faculty can edit marks only for assigned subjects'
      });
    }

    const { internal_marks, external_marks, version } = req.body;

    if (version === undefined) {
      res.status(400);
      throw new Error('Version field is required for optimistic concurrency control');
    }

    // Optimistic Concurrency Check
    if (parseInt(version) !== markEntry.version) {
      const populatedRecord = await MarkEntry.findById(markEntry._id)
        .populate('student_id', 'name roll_no isPublished')
        .populate('subject_id', 'name code')
        .populate('entered_by', 'name email role')
        .populate('updated_by', 'name email role');

      return res.status(409).json({
        message: 'Version Conflict',
        latestRecord: populatedRecord
      });
    }

    const intMarks = internal_marks !== undefined ? parseFloat(internal_marks) : markEntry.internal_marks;
    const extMarks = external_marks !== undefined ? parseFloat(external_marks) : markEntry.external_marks;

    // Boundary check
    if (intMarks < 0 || intMarks > 50 || extMarks < 0 || extMarks > 50) {
      res.status(400);
      throw new Error('Marks must be between 0 and 50');
    }

    const total = intMarks + extMarks;
    const grade = calculateGrade(total);

    // Save and increment version
    markEntry.internal_marks = intMarks;
    markEntry.external_marks = extMarks;
    markEntry.total = total;
    markEntry.grade = grade;
    markEntry.updated_by = req.user._id;
    markEntry.version = markEntry.version + 1;

    const updatedEntry = await markEntry.save();
    const populatedEntry = await MarkEntry.findById(updatedEntry._id)
      .populate('student_id', 'name roll_no department semester isPublished')
      .populate('subject_id', 'name code')
      .populate('entered_by', 'name email role')
      .populate('updated_by', 'name email role');

    res.json(populatedEntry);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Mark Entries
 * @route   GET /api/mark-entries
 * @access  Private (Admin, Faculty)
 */
const getMarkEntries = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'faculty') {
      const [faculty, facultySubjects, facultyStudents, classAssignments] = await Promise.all([
        User.findById(req.user._id).select('department handledSections handledSubjects'),
        Subject.find({ assignedFaculty: req.user._id }).select('_id'),
        Student.find({ assignedFaculty: req.user._id }).select('_id'),
        ClassAssignment.find({ faculty: req.user._id }).select('department semester section subject')
      ]);
      const profileMatches = faculty?.department && faculty?.handledSections?.length
        ? faculty.handledSections.map((section) => ({ department: faculty.department, section }))
        : [];
      const studentMatches = [
        ...classAssignments.map((assignment) => ({
          department: assignment.department,
          semester: assignment.semester,
          section: assignment.section
        })),
        ...profileMatches
      ];
      const classStudents = studentMatches.length
        ? await Student.find({
            $or: studentMatches
          }).select('_id')
        : [];

      const subjectIds = [...facultySubjects.map((subject) => subject._id), ...classAssignments.map((assignment) => assignment.subject), ...(faculty?.handledSubjects || [])];
      const studentIds = [...facultyStudents.map((student) => student._id), ...classStudents.map((student) => student._id)];
      filter.$or = [
        { subject_id: { $in: subjectIds }, student_id: { $in: studentIds } },
        { subject_id: { $in: facultySubjects.map((subject) => subject._id) } }
      ];
    }

    const entries = await MarkEntry.find(filter)
      .populate('student_id', 'name roll_no department semester isPublished')
      .populate('subject_id', 'name code')
      .populate('entered_by', 'name email role')
      .populate('updated_by', 'name email role');
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a Mark Entry
 * @route   DELETE /api/mark-entries/:id
 * @access  Private (Admin)
 */
const deleteMarkEntry = async (req, res, next) => {
  try {
    const markEntry = await MarkEntry.findById(req.params.id);
    if (!markEntry) {
      res.status(404);
      throw new Error('Mark entry not found');
    }

    await markEntry.deleteOne();
    res.json({ message: 'Mark entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMarkEntry,
  updateMarkEntry,
  getMarkEntries,
  deleteMarkEntry
};
