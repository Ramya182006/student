const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Student = require('../models/studentModel');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkey12345', {
    expiresIn: '30d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, roll_no, department, semester } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error('Please enter all required fields (name, email, password, role)');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Additional validations for student role
    if (role === 'student') {
      if (!roll_no || !department || !semester) {
        res.status(400);
        throw new Error('roll_no, department, and semester are required for student accounts');
      }
      
      const rollExists = await Student.findOne({ roll_no });
      if (rollExists) {
        res.status(400);
        throw new Error('Roll number is already registered');
      }
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    if (user) {
      // If student role, create student profile linked to user
      if (role === 'student') {
        await Student.create({
          name,
          email,
          roll_no,
          department,
          semester,
          user: user._id
        });
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Auth user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
