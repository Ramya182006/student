const User = require('../models/userModel');
const Subject = require('../models/subjectModel');

const normalizeArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const syncFacultySubjects = async (facultyId, handledSubjects = []) => {
  await Subject.updateMany(
    { assignedFaculty: facultyId, _id: { $nin: handledSubjects } },
    { $unset: { assignedFaculty: '' } }
  );

  if (handledSubjects.length) {
    await Subject.updateMany(
      { _id: { $in: handledSubjects } },
      { $set: { assignedFaculty: facultyId } }
    );
  }
};

/**
 * @desc    Get all users (optionally filtered by role)
 * @route   GET /api/users?role=faculty
 * @access  Private (Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .select('-password')
      .populate('handledSubjects', 'name code')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('handledSubjects', 'name code');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new user (admin-created faculty/student/admin accounts)
 * @route   POST /api/users
 * @access  Private (Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      designation,
      phone,
      handledSections = [],
      handledSubjects = []
    } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error('name, email, password, and role are required');
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error('A user with this email already exists');
    }

    const normalizedSubjects = normalizeArray(handledSubjects);
    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      designation,
      phone,
      handledSections: normalizeArray(handledSections),
      handledSubjects: normalizedSubjects
    });

    if (role === 'faculty') {
      await syncFacultySubjects(user._id, normalizedSubjects);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      phone: user.phone,
      handledSections: user.handledSections,
      handledSubjects: user.handledSubjects,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a user's profile (name, email, department, etc.)
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const {
      name,
      email,
      department,
      designation,
      phone,
      password,
      handledSections,
      handledSubjects
    } = req.body;

    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        res.status(400);
        throw new Error('Email is already in use by another account');
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (department !== undefined) user.department = department;
    if (designation !== undefined) user.designation = designation;
    if (phone !== undefined) user.phone = phone;
    if (password) user.password = password; // pre-save hook will hash it
    if (handledSections !== undefined) user.handledSections = normalizeArray(handledSections);
    if (handledSubjects !== undefined) user.handledSubjects = normalizeArray(handledSubjects);

    const updated = await user.save();

    if (updated.role === 'faculty' && handledSubjects !== undefined) {
      await syncFacultySubjects(updated._id, updated.handledSubjects);
    }

    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      department: updated.department,
      designation: updated.designation,
      phone: updated.phone,
      handledSections: updated.handledSections,
      handledSubjects: updated.handledSubjects,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user account
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Prevent self-deletion
    if (req.user._id.toString() === user._id.toString()) {
      res.status(400);
      throw new Error('You cannot delete your own account');
    }

    // Unassign from subjects if faculty
    if (user.role === 'faculty') {
      await Subject.updateMany(
        { assignedFaculty: user._id },
        { $unset: { assignedFaculty: '' } }
      );
    }

    await user.deleteOne();
    res.json({ message: `User "${user.name}" deleted successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
