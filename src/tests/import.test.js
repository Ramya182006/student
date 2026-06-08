const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const User = require('../models/userModel');
const Student = require('../models/studentModel');
const Subject = require('../models/subjectModel');
const MarkEntry = require('../models/markEntryModel');
const ClassAssignment = require('../models/classAssignmentModel');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/student_portal_test';
let adminToken;
let facultyToken;
let tempCsvPath;

beforeAll(async () => {
  process.env.MONGO_URI = TEST_MONGO_URI;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({});
  await Student.deleteMany({});
  await Subject.deleteMany({});
  await MarkEntry.deleteMany({});
  await ClassAssignment.deleteMany({});

  // Register Admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin User', email: 'admin_import@test.com', password: 'password', role: 'admin' });
  adminToken = adminRes.body.token;

  const facultyRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Faculty User', email: 'faculty_import@test.com', password: 'password', role: 'faculty' });
  facultyToken = facultyRes.body.token;
  const faculty = await User.findOne({ email: 'faculty_import@test.com' });

  // Create admin-linked student account
  const studentUser = await User.create({
    name: 'Hermione Granger',
    email: 'hermione_import@test.com',
    password: 'password',
    role: 'student',
    department: 'Gryffindor'
  });
  await Student.create({
    name: 'Hermione Granger',
    email: 'hermione_import@test.com',
    roll_no: 'S201',
    department: 'Gryffindor',
    semester: 2,
    section: 'A',
    user: studentUser._id
  });
  // Create Subject
  const subject = await Subject.create({ name: 'Mathematics', code: 'MATH101' });
  await ClassAssignment.create({
    department: 'Gryffindor',
    semester: 2,
    section: 'A',
    subject: subject._id,
    faculty: faculty._id
  });

  // Generate temporary CSV file
  tempCsvPath = path.join(__dirname, 'temp_import_test.csv');
  const invalidRows = Array.from({ length: 46 }, (_, index) => `S404${index},MATH101,40,40`);
  const csvContent =
`roll_no,subject_code,internal_marks,external_marks
S201,MATH101,42,44
S201,MATH999,40,40
S999,MATH101,40,40
S201,MATH101,-2,55
${invalidRows.join('\n')}
`;
  fs.writeFileSync(tempCsvPath, csvContent);
});

afterAll(async () => {
  // Clean up
  if (fs.existsSync(tempCsvPath)) {
    fs.unlinkSync(tempCsvPath);
  }
  await mongoose.connection.close();
});

describe('Bulk CSV Import API', () => {
  it('should import CSV and return summary counts', async () => {
    const res = await request(app)
      .post('/api/import')
      .set('Authorization', `Bearer ${facultyToken}`)
      .attach('file', tempCsvPath);

    expect(res.statusCode).toEqual(200);
    expect(res.body.created).toEqual(1); // Row 1 is valid
    expect(res.body.updated).toEqual(0);
    expect(res.body.skipped).toEqual(0);
    expect(res.body.failed).toEqual(49);
    expect(res.body.rows).toHaveLength(50);
    expect(res.body.rows[0].status).toEqual('created');
  });

  it('should be idempotent and skip identical rows on repeat import', async () => {
    const res = await request(app)
      .post('/api/import')
      .set('Authorization', `Bearer ${facultyToken}`)
      .attach('file', tempCsvPath);

    expect(res.statusCode).toEqual(200);
    expect(res.body.created).toEqual(0); 
    expect(res.body.updated).toEqual(0);
    expect(res.body.skipped).toEqual(1); // Row 1 is skipped since marks didn't change
    expect(res.body.failed).toEqual(49);
    expect(res.body.rows[0].status).toEqual('skipped');
  });

  it('should update grades if marks change in CSV', async () => {
    // Generate modified CSV
    const modifiedCsvPath = path.join(__dirname, 'temp_import_mod_test.csv');
    const invalidRows = Array.from({ length: 49 }, (_, index) => `S404${index},MATH101,40,40`);
    const modContent =
`roll_no,subject_code,internal_marks,external_marks
S201,MATH101,45,45
${invalidRows.join('\n')}
`;
    fs.writeFileSync(modifiedCsvPath, modContent);

    const res = await request(app)
      .post('/api/import')
      .set('Authorization', `Bearer ${facultyToken}`)
      .attach('file', modifiedCsvPath);

    expect(res.statusCode).toEqual(200);
    expect(res.body.created).toEqual(0);
    expect(res.body.updated).toEqual(1); // Row 1 marks changed from 42,44 -> 45,45
    expect(res.body.skipped).toEqual(0);
    expect(res.body.failed).toEqual(49);
    expect(res.body.rows[0].status).toEqual('updated');

    // Clean up
    fs.unlinkSync(modifiedCsvPath);
  });

  it('should let admin bulk import student and faculty accounts', async () => {
    const accountCsvPath = path.join(__dirname, 'temp_account_import_test.csv');
    const accountContent =
`role,name,email,password,department,roll_no,semester,section,admission_year,gender,date_of_birth,phone,guardian_name,guardian_phone,address,designation,handled_sections,handled_subject_codes
student,Harry Potter,harry_import@test.com,password,Gryffindor,S202,2,A,2026,Male,2006-01-01,9000000001,James Potter,9000000002,Hogwarts,,,
faculty,Minerva McGonagall,minerva_import@test.com,password,Gryffindor,,,,,,,,,,,Professor,A,MATH101
`;
    fs.writeFileSync(accountCsvPath, accountContent);

    const res = await request(app)
      .post('/api/import/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', accountCsvPath);

    expect(res.statusCode).toEqual(200);
    expect(res.body.created).toEqual(2);
    expect(res.body.failed).toEqual(0);
    expect(res.body.rows).toHaveLength(2);

    fs.unlinkSync(accountCsvPath);
  });
});
