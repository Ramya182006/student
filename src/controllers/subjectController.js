const Subject = require('../models/subjectModel');
const User = require('../models/userModel');
const ClassAssignment = require('../models/classAssignmentModel');

const normalizeClassKey = ({ department, semester, section }) => ({
  department: String(department || '').trim(),
  semester: Number(semester),
  section: String(section || '').trim()
});

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Private (Admin, Faculty)
 */
const getSubjects = async (req, res, next) => {
  try {
    const subjectFilter = {};
    let facultyProfile = null;

    if (req.user.role === 'faculty') {
      facultyProfile = await User.findById(req.user._id).select('name email department handledSections handledSubjects');
      const assignedSubjectIds = await ClassAssignment.distinct('subject', { faculty: req.user._id });
      subjectFilter.$or = [
        { assignedFaculty: req.user._id },
        { _id: { $in: [...assignedSubjectIds, ...(facultyProfile?.handledSubjects || [])] } }
      ];
    }

    const subjects = await Subject.find(subjectFilter).populate('assignedFaculty', 'name email');
    const assignments = await ClassAssignment.find(
      req.user.role === 'faculty' ? { faculty: req.user._id } : {}
    )
      .populate('subject', 'name code')
      .populate('faculty', 'name email department');

    const assignmentsBySubject = assignments.reduce((acc, assignment) => {
      const key = assignment.subject?._id?.toString() || assignment.subject?.toString();
      if (!key) return acc;
      acc[key] = acc[key] || [];
      acc[key].push(assignment);
      return acc;
    }, {});

    const enrichedSubjects = subjects.map((subject) => {
      const json = subject.toObject();
      const profileAssignments = req.user.role === 'faculty' &&
        facultyProfile?.department &&
        facultyProfile?.handledSections?.length &&
        facultyProfile?.handledSubjects?.some((handledSubject) => handledSubject.toString() === subject._id.toString())
          ? facultyProfile.handledSections.map((section) => ({
              _id: `${subject._id}-${facultyProfile.department}-${section}`,
              department: facultyProfile.department,
              semester: 'All',
              section,
              subject,
              faculty: facultyProfile
            }))
          : [];
      json.classAssignments = [...(assignmentsBySubject[subject._id.toString()] || []), ...profileAssignments];
      return json;
    });
    res.json(enrichedSubjects);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private (Admin, Faculty)
 */
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('assignedFaculty', 'name email');
    if (!subject) {
      res.status(404);
      throw new Error('Subject not found');
    }
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a subject
 * @route   POST /api/subjects
 * @access  Private (Admin)
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, assignedFaculty } = req.body;

    if (!name || !code) {
      res.status(400);
      throw new Error('Subject name and code are required');
    }

    const codeExists = await Subject.findOne({ code });
    if (codeExists) {
      res.status(400);
      throw new Error('Subject code already exists');
    }

    // Verify assigned faculty role if faculty is supplied
    if (assignedFaculty) {
      const facultyUser = await User.findById(assignedFaculty);
      if (!facultyUser || facultyUser.role !== 'faculty') {
        res.status(400);
        throw new Error('Assigned user must exist and have the role of faculty');
      }
    }

    const subject = await Subject.create({
      name,
      code,
      assignedFaculty: assignedFaculty || null
    });

    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a subject
 * @route   PUT /api/subjects/:id
 * @access  Private (Admin)
 */
const updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404);
      throw new Error('Subject not found');
    }

    const { name, code, assignedFaculty } = req.body;

    if (code && code !== subject.code) {
      const codeExists = await Subject.findOne({ code });
      if (codeExists) {
        res.status(400);
        throw new Error('Subject code already exists');
      }
      subject.code = code;
    }

    if (name) subject.name = name;

    if (assignedFaculty !== undefined) {
      if (assignedFaculty === null) {
        subject.assignedFaculty = null;
      } else {
        const facultyUser = await User.findById(assignedFaculty);
        if (!facultyUser || facultyUser.role !== 'faculty') {
          res.status(400);
          throw new Error('Assigned user must exist and have the role of faculty');
        }
        subject.assignedFaculty = assignedFaculty;
      }
    }

    const updatedSubject = await subject.save();
    res.json(updatedSubject);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a subject
 * @route   DELETE /api/subjects/:id
 * @access  Private (Admin)
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404);
      throw new Error('Subject not found');
    }

    await subject.deleteOne();
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign Faculty to a subject
 * @route   PATCH /api/subjects/:id/assign-faculty
 * @access  Private (Admin)
 */
const assignFaculty = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      res.status(404);
      throw new Error('Subject not found');
    }

    const { facultyId } = req.body;
    if (!facultyId) {
      res.status(400);
      throw new Error('Faculty ID (facultyId) is required');
    }

    const facultyUser = await User.findById(facultyId);
    if (!facultyUser || facultyUser.role !== 'faculty') {
      res.status(400);
      throw new Error('User must exist and have the role of faculty');
    }

    subject.assignedFaculty = facultyId;
    await subject.save();

    res.json({ message: `Successfully assigned Faculty ${facultyUser.name} to ${subject.name}` });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk assign subjects/faculty to a department-semester-section class
 * @route   POST /api/subjects/bulk-assign
 * @access  Private (Admin)
 */
const bulkAssignClassSubjects = async (req, res, next) => {
  try {
    const classKey = normalizeClassKey(req.body);
    const { assignments = [] } = req.body;

    if (!classKey.department || !classKey.semester || !classKey.section || !Array.isArray(assignments) || assignments.length === 0) {
      res.status(400);
      throw new Error('Department, semester, section, and at least one subject/faculty assignment are required');
    }

    const saved = [];
    for (const item of assignments) {
      const subjectId = item.subject || item.subjectId;
      const facultyId = item.faculty || item.facultyId;

      if (!subjectId || !facultyId) {
        res.status(400);
        throw new Error('Each assignment must include subject and faculty');
      }

      const [subject, faculty] = await Promise.all([
        Subject.findById(subjectId),
        User.findById(facultyId)
      ]);

      if (!subject) {
        res.status(404);
        throw new Error('Subject not found');
      }
      if (!faculty || faculty.role !== 'faculty') {
        res.status(400);
        throw new Error('Assigned user must exist and have the role of faculty');
      }

      const assignment = await ClassAssignment.findOneAndUpdate(
        { ...classKey, subject: subjectId },
        { ...classKey, subject: subjectId, faculty: facultyId },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      )
        .populate('subject', 'name code')
        .populate('faculty', 'name email department');

      saved.push(assignment);
    }

    res.json({
      message: 'Class assignments saved successfully',
      assignments: saved
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFaculty,
  bulkAssignClassSubjects
};
