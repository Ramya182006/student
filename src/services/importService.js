const fs = require('fs');
const csv = require('csv-parser');
const Student = require('../models/studentModel');
const Subject = require('../models/subjectModel');
const MarkEntry = require('../models/markEntryModel');
const User = require('../models/userModel');
const ClassAssignment = require('../models/classAssignmentModel');
const { calculateGrade } = require('../utils/helpers');

/**
 * Parses and imports grades from a CSV file.
 * CSV Header requirements: roll_no, subject_code, internal_marks, external_marks
 * @param {string} filePath
 * @param {string} actorId
 * @returns {Promise<{created: number, updated: number, skipped: number, failed: number, rows: Array}>}
 */
const importCSV = (filePath, actorId = null) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0, totalRows: 0, rows: [] };

    if (!fs.existsSync(filePath)) {
      return reject(new Error('File does not exist'));
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          summary.totalRows = results.length;

          if (results.length < 50) {
            const error = new Error('CSV import requires at least 50 data rows.');
            error.details = {
              totalRows: results.length,
              minimumRows: 50
            };
            throw error;
          }

          for (const [index, row] of results.entries()) {
            const rowResult = {
              row: index + 2,
              roll_no: row.roll_no || '',
              subject_code: row.subject_code || '',
              internal_marks: row.internal_marks ?? '',
              external_marks: row.external_marks ?? '',
              status: '',
              message: ''
            };

            const failRow = (message) => {
              rowResult.status = 'failed';
              rowResult.message = message;
              summary.failed++;
              summary.rows.push(rowResult);
            };

            const roll_no = row.roll_no ? row.roll_no.trim() : null;
            const subject_code = row.subject_code ? row.subject_code.trim() : null;
            
            // Check required fields existence
            if (!roll_no || !subject_code || row.internal_marks === undefined || row.external_marks === undefined) {
              failRow('Required fields missing: roll_no, subject_code, internal_marks, external_marks are required.');
              continue;
            }

            const internal_marks = parseFloat(row.internal_marks);
            const external_marks = parseFloat(row.external_marks);

            // Validate marks range (0-50 for internal and 0-50 for external)
            if (
              isNaN(internal_marks) || 
              isNaN(external_marks) || 
              internal_marks < 0 || 
              internal_marks > 50 || 
              external_marks < 0 || 
              external_marks > 50
            ) {
              failRow('Marks must be valid numbers between 0 and 50.');
              continue;
            }

            // Find Student by roll number
            const student = await Student.findOne({ roll_no });
            if (!student) {
              failRow(`Roll number ${roll_no} does not exist.`);
              continue;
            }

            const linkedStudentAccount = student.user
              ? await User.exists({ _id: student.user, role: 'student' })
              : null;
            if (!linkedStudentAccount) {
              failRow(`Roll number ${roll_no} is not linked to an admin-created student account.`);
              continue;
            }

            // Find Subject by code
            const subject = await Subject.findOne({ code: subject_code });
            if (!subject) {
              failRow(`Subject code ${subject_code} does not exist.`);
              continue;
            }

            if (actorId) {
              const faculty = await User.findById(actorId).select('department handledSections handledSubjects');
              const hasClassAssignment = await ClassAssignment.exists({
                faculty: actorId,
                subject: subject._id,
                department: student.department,
                semester: student.semester,
                section: student.section
              });
              const hasProfileAssignment = !!(
                faculty?.department === student.department &&
                faculty?.handledSections?.includes(student.section) &&
                faculty?.handledSubjects?.some((handledSubject) => handledSubject.toString() === subject._id.toString())
              );

              if (!hasClassAssignment && !hasProfileAssignment) {
                failRow('Faculty is not assigned to this student class and subject.');
                continue;
              }
            }

            const total = internal_marks + external_marks;
            const grade = calculateGrade(total);

            // Idempotency check: Find if MarkEntry exists for student and subject
            const existingEntry = await MarkEntry.findOne({
              student_id: student._id,
              subject_id: subject._id
            });

            if (!existingEntry) {
              // Create new record
              await MarkEntry.create({
                student_id: student._id,
                subject_id: subject._id,
                internal_marks,
                external_marks,
                total,
                grade,
                entered_by: actorId,
                updated_by: actorId,
                version: 1
              });
              summary.created++;
              rowResult.status = 'created';
              rowResult.message = 'Mark entry created.';
            } else {
              // If it exists, check if marks differ
              if (
                existingEntry.internal_marks !== internal_marks ||
                existingEntry.external_marks !== external_marks
              ) {
                // Update with version increment
                existingEntry.internal_marks = internal_marks;
                existingEntry.external_marks = external_marks;
                existingEntry.total = total;
                existingEntry.grade = grade;
                existingEntry.updated_by = actorId;
                existingEntry.version = existingEntry.version + 1;
                await existingEntry.save();
                summary.updated++;
                rowResult.status = 'updated';
                rowResult.message = 'Existing mark entry updated.';
              } else {
                // Identical data - skip to maintain idempotency
                summary.skipped++;
                rowResult.status = 'skipped';
                rowResult.message = 'Identical row skipped; no duplicate created.';
              }
            }
            summary.rows.push(rowResult);
          }
          resolve(summary);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const splitList = (value) => String(value || '')
  .split('|')
  .map((item) => item.trim())
  .filter(Boolean);

const importAccountsCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0, totalRows: 0, rows: [] };

    if (!fs.existsSync(filePath)) {
      return reject(new Error('File does not exist'));
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          summary.totalRows = results.length;

          for (const [index, row] of results.entries()) {
            const role = String(row.role || '').trim().toLowerCase();
            const email = String(row.email || '').trim().toLowerCase();
            const rowResult = {
              row: index + 2,
              role,
              name: row.name || '',
              email,
              roll_no: row.roll_no || '',
              status: '',
              message: ''
            };

            const failRow = (message) => {
              rowResult.status = 'failed';
              rowResult.message = message;
              summary.failed++;
              summary.rows.push(rowResult);
            };

            if (!['student', 'faculty'].includes(role)) {
              failRow('role must be student or faculty.');
              continue;
            }
            if (!row.name || !email || !row.password || !row.department) {
              failRow('Required fields missing: role, name, email, password, department.');
              continue;
            }
            if (String(row.password).length < 6) {
              failRow('Password must be at least 6 characters.');
              continue;
            }

            const existingUser = await User.findOne({ email });
            if (role === 'faculty') {
              const handledSubjectCodes = splitList(row.handled_subject_codes);
              const handledSubjects = handledSubjectCodes.length
                ? await Subject.find({ code: { $in: handledSubjectCodes } }).select('_id code')
                : [];

              if (handledSubjectCodes.length !== handledSubjects.length) {
                failRow('One or more handled_subject_codes do not exist.');
                continue;
              }

              if (existingUser) {
                rowResult.status = 'skipped';
                rowResult.message = 'Faculty account already exists; no duplicate created.';
                summary.skipped++;
                summary.rows.push(rowResult);
                continue;
              }

              await User.create({
                name: row.name,
                email,
                password: row.password,
                role: 'faculty',
                department: row.department,
                designation: row.designation || 'Assistant Professor',
                phone: row.phone || '',
                handledSections: splitList(row.handled_sections),
                handledSubjects: handledSubjects.map((subject) => subject._id)
              });
              rowResult.status = 'created';
              rowResult.message = 'Faculty account created.';
              summary.created++;
              summary.rows.push(rowResult);
              continue;
            }

            if (!row.roll_no || !row.semester || !row.section) {
              failRow('Student rows require roll_no, semester, and section.');
              continue;
            }

            const existingStudent = await Student.findOne({ roll_no: row.roll_no });
            if (existingUser || existingStudent) {
              rowResult.status = 'skipped';
              rowResult.message = 'Student account or roll number already exists; no duplicate created.';
              summary.skipped++;
              summary.rows.push(rowResult);
              continue;
            }

            const linkedUser = await User.create({
              name: row.name,
              email,
              password: row.password,
              role: 'student',
              department: row.department,
              phone: row.phone || ''
            });

            await Student.create({
              name: row.name,
              email,
              roll_no: row.roll_no,
              department: row.department,
              semester: Number(row.semester),
              section: row.section,
              admission_year: row.admission_year ? Number(row.admission_year) : null,
              gender: row.gender || '',
              date_of_birth: row.date_of_birth || null,
              phone: row.phone || '',
              guardian_name: row.guardian_name || '',
              guardian_phone: row.guardian_phone || '',
              address: row.address || '',
              user: linkedUser._id
            });

            rowResult.status = 'created';
            rowResult.message = 'Student account and profile created.';
            summary.created++;
            summary.rows.push(rowResult);
          }

          resolve(summary);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
};

module.exports = {
  importCSV,
  importAccountsCSV
};
