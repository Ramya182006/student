const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    trim: true
  },
  assignedFaculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Can be unassigned initially
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subject', subjectSchema);
