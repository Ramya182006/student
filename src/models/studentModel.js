const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  roll_no: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: '',
    index: {
      unique: true,
      sparse: true,
      partialFilterExpression: { email: { $type: 'string', $gt: '' } }
    },
    match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please fill a valid email address']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required']
  },
  section: {
    type: String,
    trim: true,
    default: ''
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  admission_year: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    enum: ['', 'Male', 'Female', 'Other'],
    default: ''
  },
  date_of_birth: {
    type: Date,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  guardian_name: {
    type: String,
    trim: true,
    default: ''
  },
  guardian_phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be null if the student profile is created before registration
  },
  isPublished: {
    type: Boolean,
    default: false // Controlled by Admin
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
