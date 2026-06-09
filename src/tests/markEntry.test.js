const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const Student = require('../models/studentModel');
const Subject = require('../models/subjectModel');
const MarkEntry = require('../models/markEntryModel');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/student_portal_test';

let adminToken, facultyAToken, facultyBToken;
let facultyAId, facultyBId;
let studentId, subjectId, markEntryId;
let facultyBStudentId, facultyBSubjectId, facultyBMarkEntryId;

beforeAll(async () => {
  process.env.MONGO_URI = TEST_MONGO_URI;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
  
  // Clear database
  await User.deleteMany({});
  await Student.deleteMany({});
  await Subject.deleteMany({});
  await MarkEntry.deleteMany({});

  // 1. Create users
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Admin', email: 'admin@test.com', password: 'password', role: 'admin' });
  adminToken = adminRes.body.token;

  const facultyARes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Faculty A', email: 'fac_a@test.com', password: 'password', role: 'faculty' });
  facultyAToken = facultyARes.body.token;
  facultyAId = facultyARes.body._id;

  const facultyBRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Faculty B', email: 'fac_b@test.com', password: 'password', role: 'faculty' });
  facultyBToken = facultyBRes.body.token;
  facultyBId = facultyBRes.body._id;

  // 2. Create Student
  const student = await Student.create({
    name: 'Ron Weasley',
    roll_no: 'S102',
    department: 'Gryffindor',
    semester: 1
  });
  studentId = student._id.toString();

  // 3. Create Subject
  const subject = await Subject.create({
    name: 'Defense Against the Dark Arts',
    code: 'DADA101',
    assignedFaculty: facultyAId // Faculty A is assigned
  });
  subjectId = subject._id.toString();

  const facultyBStudent = await Student.create({
    name: 'Hermione Granger',
    roll_no: 'S103',
    department: 'Gryffindor',
    semester: 1,
    assignedFaculty: facultyBId
  });
  facultyBStudentId = facultyBStudent._id.toString();

  const facultyBSubject = await Subject.create({
    name: 'Arithmancy',
    code: 'AR101',
    assignedFaculty: facultyBId
  });
  facultyBSubjectId = facultyBSubject._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('MarkEntry & Concurrency APIs', () => {
  it('should prevent Faculty B (unassigned) from creating a grade entry', async () => {
    const res = await request(app)
      .post('/api/mark-entries')
      .set('Authorization', `Bearer ${facultyBToken}`)
      .send({
        student_id: studentId,
        subject_id: subjectId,
        internal_marks: 40,
        external_marks: 45
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toContain('Faculty can edit marks only for assigned subjects');
  });

  it('should allow Faculty A (assigned) to create a grade entry and calculate server-side grade', async () => {
    const res = await request(app)
      .post('/api/mark-entries')
      .set('Authorization', `Bearer ${facultyAToken}`)
      .send({
        student_id: studentId,
        subject_id: subjectId,
        internal_marks: 45, // Total 45+46 = 91 -> Grade 'O'
        external_marks: 46
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.total).toEqual(91);
    expect(res.body.grade).toEqual('O');
    expect(res.body.version).toEqual(1);
    markEntryId = res.body._id;
  });

  it('should only list mark entries for the logged-in faculty', async () => {
    const facultyBMarkEntry = await MarkEntry.create({
      student_id: facultyBStudentId,
      subject_id: facultyBSubjectId,
      internal_marks: 42,
      external_marks: 43,
      total: 85,
      grade: 'A+',
      entered_by: facultyBId,
      updated_by: facultyBId
    });
    facultyBMarkEntryId = facultyBMarkEntry._id.toString();

    const facultyARes = await request(app)
      .get('/api/mark-entries')
      .set('Authorization', `Bearer ${facultyAToken}`);

    expect(facultyARes.statusCode).toEqual(200);
    expect(facultyARes.body.map((entry) => entry._id)).toContain(markEntryId);
    expect(facultyARes.body.map((entry) => entry._id)).not.toContain(facultyBMarkEntryId);

    const facultyBRes = await request(app)
      .get('/api/mark-entries')
      .set('Authorization', `Bearer ${facultyBToken}`);

    expect(facultyBRes.statusCode).toEqual(200);
    expect(facultyBRes.body.map((entry) => entry._id)).toContain(facultyBMarkEntryId);
    expect(facultyBRes.body.map((entry) => entry._id)).not.toContain(markEntryId);
  });

  it('should prevent Faculty B from editing Faculty A\'s assigned subject grade entry', async () => {
    const res = await request(app)
      .put(`/api/mark-entries/${markEntryId}`)
      .set('Authorization', `Bearer ${facultyBToken}`)
      .send({
        internal_marks: 40,
        external_marks: 40,
        version: 1
      });

    expect(res.statusCode).toEqual(403);
  });

  it('should update grade entry when correct version is sent', async () => {
    const res = await request(app)
      .put(`/api/mark-entries/${markEntryId}`)
      .set('Authorization', `Bearer ${facultyAToken}`)
      .send({
        internal_marks: 40,
        external_marks: 40, // 80 -> A+
        version: 1
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.total).toEqual(80);
    expect(res.body.grade).toEqual('A+');
    expect(res.body.version).toEqual(2);
  });

  it('should return 409 Version Conflict if older version is sent', async () => {
    const res = await request(app)
      .put(`/api/mark-entries/${markEntryId}`)
      .set('Authorization', `Bearer ${facultyAToken}`)
      .send({
        internal_marks: 35,
        external_marks: 35,
        version: 1 // DB has version 2 now
      });

    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toEqual('Version Conflict');
    expect(res.body).toHaveProperty('latestRecord');
    expect(res.body.latestRecord.version).toEqual(2);
  });

  it('should allow explicit overwrite when force flag is sent', async () => {
    const res = await request(app)
      .put(`/api/mark-entries/${markEntryId}`)
      .set('Authorization', `Bearer ${facultyAToken}`)
      .send({
        internal_marks: 35,
        external_marks: 35,
        version: 1,
        force: true
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.total).toEqual(70);
    expect(res.body.grade).toEqual('A');
    expect(res.body.version).toEqual(3);
  });

  it('should keep Admin read-only for mark entry create and update APIs', async () => {
    const createRes = await request(app)
      .post('/api/mark-entries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        subject_id: subjectId,
        internal_marks: 30,
        external_marks: 30
      });

    expect(createRes.statusCode).toEqual(403);

    const updateRes = await request(app)
      .put(`/api/mark-entries/${markEntryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        internal_marks: 45,
        external_marks: 45,
        version: 3
      });

    expect(updateRes.statusCode).toEqual(403);
  });
});
