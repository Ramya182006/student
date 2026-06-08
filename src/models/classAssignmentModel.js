const mongoose = require('mongoose');

const classAssignmentSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    trim: true
  },
  semester: {
    type: Number,
    required: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

classAssignmentSchema.index(
  { department: 1, semester: 1, section: 1, subject: 1 },
  { unique: true }
);

module.exports = mongoose.model('ClassAssignment', classAssignmentSchema);
