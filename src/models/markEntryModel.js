const mongoose = require('mongoose');

const markEntrySchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject ID is required']
  },
  internal_marks: {
    type: Number,
    required: [true, 'Internal marks are required'],
    min: [0, 'Marks cannot be negative'],
    max: [100, 'Marks cannot exceed 100'] // Max range validation
  },
  external_marks: {
    type: Number,
    required: [true, 'External marks are required'],
    min: [0, 'Marks cannot be negative'],
    max: [100, 'Marks cannot exceed 100']
  },
  total: {
    type: Number,
    required: [true, 'Total marks are required']
  },
  grade: {
    type: String,
    required: [true, 'Grade is required']
  },
  entered_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Enforce unique mark entry per student and subject
markEntrySchema.index({ student_id: 1, subject_id: 1 }, { unique: true });

module.exports = mongoose.model('MarkEntry', markEntrySchema);
