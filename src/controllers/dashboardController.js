const Student = require('../models/studentModel');
const MarkEntry = require('../models/markEntryModel');
const Subject = require('../models/subjectModel');
const User = require('../models/userModel');
const ClassAssignment = require('../models/classAssignmentModel');

const getFacultyClassAssignments = (facultyId) =>
  ClassAssignment.find({ faculty: facultyId })
    .populate('subject', 'name code')
    .populate('faculty', 'name email department');

/**
 * @desc    Get dashboard KPIs
 * @route   GET /api/dashboard/kpis
 * @access  Private (Admin, Faculty, Student)
 */
const getKPIs = async (req, res, next) => {
  try {
    let studentFilter = {};
    let markFilter = {};
    let assignments = [];
    let assignedSubjects = [];
    let assignedStudents = [];

    if (req.user.role === 'faculty') {
      const faculty = await User.findById(req.user._id).select('department handledSections handledSubjects');
      assignments = await getFacultyClassAssignments(req.user._id);
      const classMatches = assignments.map((assignment) => ({
        department: assignment.department,
        semester: assignment.semester,
        section: assignment.section
      }));
      const profileMatches = faculty?.department && faculty?.handledSections?.length
        ? faculty.handledSections.map((section) => ({
            department: faculty.department,
            section
          }))
        : [];
      const subjectIds = [
        ...assignments.map((assignment) => assignment.subject?._id || assignment.subject),
        ...(await Subject.find({ assignedFaculty: req.user._id }).distinct('_id')),
        ...(faculty?.handledSubjects || [])
      ];

      studentFilter = {
        $or: [
          { assignedFaculty: req.user._id },
          { subject: { $in: subjectIds } },
          ...classMatches,
          ...profileMatches
        ]
      };

      assignedStudents = await Student.find(studentFilter)
        .select('name roll_no department semester section email phone')
        .sort({ department: 1, semester: 1, section: 1, roll_no: 1, name: 1 });
      const scopedStudentIds = assignedStudents.map((student) => student._id);
      markFilter = { student_id: { $in: scopedStudentIds } };
      const profileAssignments = faculty?.handledSubjects?.length && faculty?.department && faculty?.handledSections?.length
        ? (await Subject.find({ _id: { $in: faculty.handledSubjects } }).select('name code')).flatMap((subject) =>
            faculty.handledSections.map((section) => ({
              _id: `${subject._id}-${faculty.department}-${section}`,
              department: faculty.department,
              semester: 'All',
              section,
              subject,
              faculty
            }))
          )
        : [];
      assignedSubjects = [...assignments, ...profileAssignments];
    }

    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      if (student) {
        studentFilter = { _id: student._id };
        markFilter = { student_id: student._id };
        assignedSubjects = await ClassAssignment.find({
          department: student.department,
          semester: student.semester,
          section: student.section
        })
          .populate('subject', 'name code')
          .populate('faculty', 'name email department');
      } else {
        studentFilter = { _id: null };
        markFilter = { student_id: null };
      }
    }

    if (req.user.role === 'admin') {
      assignments = await ClassAssignment.find()
        .populate('subject', 'name code')
        .populate('faculty', 'name email department');
      assignedSubjects = assignments;
    }

    const totalStudents = await Student.countDocuments(studentFilter);

    const averageScoreResult = await MarkEntry.aggregate([
      { $match: markFilter },
      {
        $group: {
          _id: null,
          average: { $avg: '$total' }
        }
      }
    ]);
    const averageScore = averageScoreResult.length > 0 
      ? parseFloat(averageScoreResult[0].average.toFixed(2)) 
      : 0;

    const distinctFailStudents = await MarkEntry.distinct('student_id', { ...markFilter, grade: 'F' });
    const failCount = distinctFailStudents.length;

    const passPercentage = totalStudents > 0 
      ? parseFloat((((totalStudents - failCount) / totalStudents) * 100).toFixed(2))
      : 0;

    const classCount = new Set(
      assignedSubjects.map((assignment) => `${assignment.department}-${assignment.semester}-${assignment.section}`)
    ).size;

    res.json({
      totalStudents,
      averageScore,
      passPercentage,
      failCount,
      classCount,
      assignedSubjects,
      assignedStudents
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKPIs
};
