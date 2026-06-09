const Student = require('../models/studentModel');
const MarkEntry = require('../models/markEntryModel');
const User = require('../models/userModel');
const Subject = require('../models/subjectModel');
const ClassAssignment = require('../models/classAssignmentModel');

const normalizeObjectId = (value) => value || null;

const assertFaculty = async (facultyId) => {
  if (!facultyId) return null;
  const faculty = await User.findById(facultyId);
  if (!faculty || faculty.role !== 'faculty') {
    throw new Error('Assigned faculty must exist and have the role of faculty');
  }
  return faculty;
};

const assertSubject = async (subjectId) => {
  if (!subjectId) return null;
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new Error('Selected subject does not exist');
  }
  return subject;
};

const getFacultyStudentScope = async (facultyId) => {
  const [faculty, facultySubjects, classAssignments] = await Promise.all([
    User.findById(facultyId).select('department handledSections handledSubjects'),
    Subject.find({ assignedFaculty: facultyId }).select('_id'),
    ClassAssignment.find({ faculty: facultyId }).select('department semester section subject')
  ]);

  const handledSubjects = faculty?.handledSubjects || [];
  const profileMatches = faculty?.department && faculty?.handledSections?.length
    ? faculty.handledSections.map((section) => ({
        department: faculty.department,
        section
      }))
    : [];

  return {
    subjectIds: [
      ...facultySubjects.map((subject) => subject._id),
      ...classAssignments.map((assignment) => assignment.subject),
      ...handledSubjects
    ],
    classMatches: classAssignments.map((assignment) => ({
      department: assignment.department,
      semester: assignment.semester,
      section: assignment.section
    })),
    profileMatches
  };
};

const getAssignedSubjectsForStudent = async (student) => {
  const [classAssignments, profileFaculty] = await Promise.all([
    ClassAssignment.find({
      department: student.department,
      semester: student.semester,
      section: student.section
    })
      .populate('subject', 'name code')
      .populate('faculty', 'name email department'),
    User.find({
      role: 'faculty',
      department: student.department,
      handledSections: student.section
    })
      .select('name email department handledSubjects')
      .populate('handledSubjects', 'name code')
  ]);

  const deduped = new Map();

  const addAssignment = (assignment) => {
    const subjectId = assignment?.subject?._id || assignment?.subject;
    if (!subjectId) return;

    const key = subjectId.toString();
    if (!deduped.has(key)) {
      deduped.set(key, assignment);
    }
  };

  classAssignments.forEach(addAssignment);

  profileFaculty.forEach((faculty) => {
    (faculty.handledSubjects || []).forEach((subject) => {
      addAssignment({
        _id: `${subject._id}-${faculty._id}-${student.department}-${student.section}`,
        department: student.department,
        semester: student.semester,
        section: student.section,
        subject,
        faculty
      });
    });
  });

  return [...deduped.values()];
};

const getReportReadiness = async (student) => {
  const [assignedSubjects, marks] = await Promise.all([
    getAssignedSubjectsForStudent(student),
    MarkEntry.find({ student_id: student._id }).select('subject_id')
  ]);

  const assignedSubjectIds = new Set(
    assignedSubjects
      .map((assignment) => assignment.subject?._id || assignment.subject)
      .filter(Boolean)
      .map((subjectId) => subjectId.toString())
  );
  const markedSubjectIds = new Set(
    marks
      .map((mark) => mark.subject_id)
      .filter(Boolean)
      .map((subjectId) => subjectId.toString())
  );
  const missingSubjectIds = [...assignedSubjectIds].filter((subjectId) => !markedSubjectIds.has(subjectId));

  return {
    assignedCount: assignedSubjectIds.size,
    markedCount: [...assignedSubjectIds].filter((subjectId) => markedSubjectIds.has(subjectId)).length,
    missingCount: missingSubjectIds.length,
    missingSubjectIds
  };
};

/**
 * @desc    Get all students with search, filter, and pagination
 * @route   GET /api/students
 * @access  Private (Admin, Faculty)
 */
const getStudents = async (req, res, next) => {
  try {
    const { search, department, semester, section, status, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skipNum = (pageNum - 1) * limitNum;

    const pipeline = [];

    // Match criteria for students
    const match = {};
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { roll_no: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { guardian_name: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) {
      match.department = department;
    }
    if (semester) {
      match.semester = parseInt(semester);
    }
    if (section) {
      match.section = section;
    }

    if (req.user.role === 'faculty') {
      const { subjectIds, classMatches, profileMatches } = await getFacultyStudentScope(req.user._id);
      match.$and = [
        ...(match.$and || []),
        {
          $or: [
            { assignedFaculty: req.user._id },
            { subject: { $in: subjectIds } },
            ...classMatches,
            ...profileMatches
          ]
        }
      ];
    }

    pipeline.push({ $match: match });

    pipeline.push(
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject'
        }
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedFaculty',
          foreignField: '_id',
          as: 'assignedFaculty'
        }
      },
      { $unwind: { path: '$assignedFaculty', preserveNullAndEmptyArrays: true } },
      { $unset: 'assignedFaculty.password' }
    );

    // Lookup mark entries to determine pass/fail
    pipeline.push({
      $lookup: {
        from: 'markentries', // Collection name for MarkEntry in DB
        localField: '_id',
        foreignField: 'student_id',
        as: 'marks'
      }
    });

    // Filter by pass/fail status
    if (status) {
      if (status.toLowerCase() === 'fail') {
        // Failing means they have at least one MarkEntry with grade 'F'
        pipeline.push({
          $match: {
            'marks.grade': 'F'
          }
        });
      } else if (status.toLowerCase() === 'pass') {
        // Passing means they have NO 'F' grades (and let's assume they have taken at least one class or are clear)
        pipeline.push({
          $match: {
            $and: [
              { 'marks.grade': { $ne: 'F' } }
            ]
          }
        });
      }
    }

    pipeline.push({
      $addFields: {
        status: {
          $cond: [
            { $eq: [{ $size: '$marks' }, 0] },
            'pending',
            {
              $cond: [
                { $in: ['F', '$marks.grade'] },
                'fail',
                'pass'
              ]
            }
          ]
        }
      }
    });

    // Facet for pagination metadata and actual records
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skipNum }, { $limit: limitNum }]
      }
    });

    const results = await Student.aggregate(pipeline);
    
    const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
    const students = results[0].data;

    res.json({
      students,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      totalResults: total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student by ID (including their mark entries if published)
 * @route   GET /api/students/:id
 * @access  Private (Admin, Faculty, Student)
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('subject', 'name code assignedFaculty')
      .populate('assignedFaculty', 'name email department handledSections handledSubjects');
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Role restrictions: students can only view their own profile
    if (req.user.role === 'student') {
      const isOwner = student.user && student.user.toString() === req.user._id.toString();
      if (!isOwner) {
        res.status(403);
        throw new Error('Forbidden: You can only view your own student report card');
      }
    }

    if (req.user.role === 'faculty') {
      const ownsStudent = student.assignedFaculty?._id?.toString() === req.user._id.toString();
      const ownsSubject = student.subject?.assignedFaculty?.toString() === req.user._id.toString();
      const ownsClass = await ClassAssignment.exists({
        faculty: req.user._id,
        department: student.department,
        semester: student.semester,
        section: student.section
      });
      if (!ownsStudent && !ownsSubject && !ownsClass) {
        res.status(403);
        throw new Error('Forbidden: You can only view students assigned to you');
      }
    }

    const [marks, assignedSubjects] = await Promise.all([
      MarkEntry.find({ student_id: student._id })
        .populate('subject_id', 'name code')
        .populate('entered_by', 'name email role')
        .populate('updated_by', 'name email role'),
      getAssignedSubjectsForStudent(student)
    ]);

    // Report card publication policy
    if (req.user.role === 'student' && !student.isPublished) {
      return res.json({
        student,
        message: 'Report card has not been published yet.',
        marks: [],
        assignedSubjects
      });
    }

    res.json({
      student,
      marks,
      assignedSubjects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in student's own profile and report marks
 * @route   GET /api/students/me
 * @access  Private (Student)
 */
const getMyStudentReport = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      res.status(404);
      throw new Error('Student profile is not linked to this account');
    }

    if (!student.isPublished) {
      const assignedSubjects = await getAssignedSubjectsForStudent(student);

      return res.json({
        student,
        message: 'Report card has not been published yet.',
        marks: [],
        assignedSubjects
      });
    }

    const [marks, assignedSubjects] = await Promise.all([
      MarkEntry.find({ student_id: student._id })
        .populate('subject_id', 'name code')
        .populate('entered_by', 'name email role')
        .populate('updated_by', 'name email role'),
      getAssignedSubjectsForStudent(student)
    ]);

    res.json({
      student,
      marks,
      assignedSubjects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a student profile
 * @route   POST /api/students
 * @access  Private (Admin)
 */
const createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email = '',
      password = '',
      roll_no,
      department,
      semester,
      section = '',
      subject = null,
      assignedFaculty = null,
      admission_year = null,
      gender = '',
      date_of_birth = null,
      phone = '',
      guardian_name = '',
      guardian_phone = '',
      address = ''
    } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    if (
      !name ||
      !roll_no ||
      !normalizedEmail ||
      !password ||
      !department ||
      !semester ||
      !section ||
      !admission_year ||
      !gender ||
      !date_of_birth ||
      !phone ||
      !guardian_name ||
      !guardian_phone ||
      !address
    ) {
      res.status(400);
      throw new Error('Please fill all student, academic, personal, and guardian details');
    }

    const rollExists = await Student.findOne({ roll_no });
    if (rollExists) {
      res.status(400);
      throw new Error('Roll number already exists');
    }

    const [emailStudentExists, emailUserExists] = await Promise.all([
      Student.findOne({ email: normalizedEmail }),
      User.findOne({ email: normalizedEmail })
    ]);

    if (emailStudentExists || emailUserExists) {
      res.status(400);
      throw new Error('A student or user with this email already exists');
    }

    try {
      await Promise.all([assertSubject(subject), assertFaculty(assignedFaculty)]);
    } catch (error) {
      res.status(400);
      throw error;
    }

    const linkedUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'student',
      department,
      phone
    });

    const student = await Student.create({
      name,
      email: normalizedEmail,
      roll_no,
      department,
      semester,
      section,
      subject: normalizeObjectId(subject),
      assignedFaculty: normalizeObjectId(assignedFaculty),
      admission_year: admission_year ? Number(admission_year) : null,
      gender,
      date_of_birth: date_of_birth || null,
      phone,
      guardian_name,
      guardian_phone,
      address,
      user: linkedUser?._id || null
    });

    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update student profile
 * @route   PUT /api/students/:id
 * @access  Private (Admin)
 */
const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const {
      name,
      email,
      password,
      roll_no,
      department,
      semester,
      section,
      subject,
      assignedFaculty,
      admission_year,
      gender,
      date_of_birth,
      phone,
      guardian_name,
      guardian_phone,
      address
    } = req.body;

    if (
      !name ||
      !roll_no ||
      !email ||
      !department ||
      !semester ||
      !section ||
      !admission_year ||
      !gender ||
      !date_of_birth ||
      !phone ||
      !guardian_name ||
      !guardian_phone ||
      !address
    ) {
      res.status(400);
      throw new Error('Please fill all student, academic, personal, and guardian details');
    }

    if (roll_no && roll_no !== student.roll_no) {
      const rollExists = await Student.findOne({ roll_no });
      if (rollExists) {
        res.status(400);
        throw new Error('Roll number already exists');
      }
      student.roll_no = roll_no;
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
    if (normalizedEmail !== undefined && normalizedEmail !== student.email) {
      if (normalizedEmail) {
        const userEmailFilter = student.user
          ? { email: normalizedEmail, _id: { $ne: student.user } }
          : { email: normalizedEmail };
        const [emailStudentExists, emailUserExists] = await Promise.all([
          Student.findOne({ email: normalizedEmail, _id: { $ne: student._id } }),
          User.findOne(userEmailFilter)
        ]);

        if (emailStudentExists || emailUserExists) {
          res.status(400);
          throw new Error('Email is already in use by another student or user');
        }
      }
      student.email = normalizedEmail;
    }

    if (name) student.name = name;
    if (department) student.department = department;
    if (semester) student.semester = semester;
    if (section !== undefined) student.section = section;
    if (subject !== undefined) {
      try {
        await assertSubject(subject);
      } catch (error) {
        res.status(400);
        throw error;
      }
      student.subject = normalizeObjectId(subject);
    }
    if (assignedFaculty !== undefined) {
      try {
        await assertFaculty(assignedFaculty);
      } catch (error) {
        res.status(400);
        throw error;
      }
      student.assignedFaculty = normalizeObjectId(assignedFaculty);
    }
    if (admission_year !== undefined) student.admission_year = admission_year ? Number(admission_year) : null;
    if (gender !== undefined) student.gender = gender;
    if (date_of_birth !== undefined) student.date_of_birth = date_of_birth || null;
    if (phone !== undefined) student.phone = phone;
    if (guardian_name !== undefined) student.guardian_name = guardian_name;
    if (guardian_phone !== undefined) student.guardian_phone = guardian_phone;
    if (address !== undefined) student.address = address;

    const updatedStudent = await student.save();

    if ((updatedStudent.email || password) && updatedStudent.user) {
      const user = await User.findById(updatedStudent.user);
      if (user) {
        if (updatedStudent.email) user.email = updatedStudent.email;
        if (name) user.name = name;
        if (department !== undefined) user.department = department;
        if (phone !== undefined) user.phone = phone;
        if (password) user.password = password;
        await user.save();
      }
    } else if (updatedStudent.email && password && !updatedStudent.user) {
      const linkedUser = await User.create({
        name: updatedStudent.name,
        email: updatedStudent.email,
        password,
        role: 'student',
        department: updatedStudent.department,
        phone: updatedStudent.phone
      });
      updatedStudent.user = linkedUser._id;
      await updatedStudent.save();
    }

    res.json(updatedStudent);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete student profile
 * @route   DELETE /api/students/:id
 * @access  Private (Admin)
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Remove associated mark entries as well
    await MarkEntry.deleteMany({ student_id: student._id });
    if (student.user) {
      await User.findByIdAndDelete(student.user);
    }
    await student.deleteOne();

    res.json({ message: 'Student and associated grades deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish Report Card
 * @route   PATCH /api/students/:id/publish
 * @access  Private (Admin)
 */
const publishReportCard = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    const readiness = await getReportReadiness(student);
    if (readiness.assignedCount === 0) {
      res.status(400);
      throw new Error('Cannot publish: no subjects are assigned to this student.');
    }
    if (readiness.missingCount > 0) {
      res.status(400);
      throw new Error(`Cannot publish: ${readiness.missingCount} subject mark entries are pending.`);
    }

    student.isPublished = true;
    await student.save();

    res.json({
      message: `Report card for student ${student.name} published successfully`,
      isPublished: true,
      readiness
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unpublish Report Card
 * @route   PATCH /api/students/:id/unpublish
 * @access  Private (Admin)
 */
const unpublishReportCard = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    student.isPublished = false;
    await student.save();

    res.json({ message: `Report card for student ${student.name} unpublished successfully`, isPublished: false });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getMyStudentReport,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  publishReportCard,
  unpublishReportCard
};
