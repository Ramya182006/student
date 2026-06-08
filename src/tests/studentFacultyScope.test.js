const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const Student = require('../models/studentModel');
const Subject = require('../models/subjectModel');
const MarkEntry = require('../models/markEntryModel');
const ClassAssignment = require('../models/classAssignmentModel');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/student_portal_test';

beforeAll(async () => {
  process.env.MONGO_URI = TEST_MONGO_URI;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Student.deleteMany({});
  await Subject.deleteMany({});
  await MarkEntry.deleteMany({});
  await ClassAssignment.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Student faculty scoping', () => {
  it('lists only students assigned to the logged-in faculty', async () => {
    const facultyARes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Faculty A', email: 'faculty-a@test.com', password: 'password', role: 'faculty' });

    const facultyBRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Faculty B', email: 'faculty-b@test.com', password: 'password', role: 'faculty' });

    const facultyAId = facultyARes.body._id;
    const facultyBId = facultyBRes.body._id;

    const facultyASubject = await Subject.create({
      name: 'Computer Networks',
      code: 'CN101',
      assignedFaculty: facultyAId
    });

    const facultyBSubject = await Subject.create({
      name: 'Operating Systems',
      code: 'OS101',
      assignedFaculty: facultyBId
    });

    const directlyAssigned = await Student.create({
      name: 'Alice Johnson',
      roll_no: 'CS2023001',
      department: 'CS',
      semester: 5,
      assignedFaculty: facultyAId
    });

    const subjectAssigned = await Student.create({
      name: 'Bob Williams',
      roll_no: 'CS2023002',
      department: 'CS',
      semester: 5,
      subject: facultyASubject._id
    });

    const otherFacultyStudent = await Student.create({
      name: 'Eva Martinez',
      roll_no: 'IT2023001',
      department: 'IT',
      semester: 3,
      assignedFaculty: facultyBId,
      subject: facultyBSubject._id
    });

    const unassigned = await Student.create({
      name: 'Carol Davis',
      roll_no: 'CS2023003',
      department: 'IT',
      semester: 3
    });

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${facultyARes.body.token}`);

    const returnedIds = res.body.students.map((student) => student._id);

    expect(res.statusCode).toEqual(200);
    expect(returnedIds).toContain(directlyAssigned._id.toString());
    expect(returnedIds).toContain(subjectAssigned._id.toString());
    expect(returnedIds).not.toContain(otherFacultyStudent._id.toString());
    expect(returnedIds).not.toContain(unassigned._id.toString());
  });

  it('returns only class-assigned students on the faculty dashboard', async () => {
    const facultyRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Faculty John', email: 'john@test.com', password: 'password', role: 'faculty' });

    const otherFacultyRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Faculty Other', email: 'other@test.com', password: 'password', role: 'faculty' });

    const dbms = await Subject.create({ name: 'DBMS', code: 'DB101' });
    const circuits = await Subject.create({ name: 'Circuits', code: 'EC101' });

    await ClassAssignment.create({
      department: 'CSE',
      semester: 1,
      section: 'A',
      subject: dbms._id,
      faculty: facultyRes.body._id
    });

    await ClassAssignment.create({
      department: 'ECE',
      semester: 1,
      section: 'A',
      subject: circuits._id,
      faculty: facultyRes.body._id
    });

    const cseStudent = await Student.create({
      name: 'CSE Student',
      roll_no: 'CSE001',
      department: 'CSE',
      semester: 1,
      section: 'A'
    });

    const eceStudent = await Student.create({
      name: 'ECE Student',
      roll_no: 'ECE001',
      department: 'ECE',
      semester: 1,
      section: 'A'
    });

    const otherStudent = await Student.create({
      name: 'IT Student',
      roll_no: 'IT001',
      department: 'IT',
      semester: 1,
      section: 'A',
      assignedFaculty: otherFacultyRes.body._id
    });

    const res = await request(app)
      .get('/api/dashboard/kpis')
      .set('Authorization', `Bearer ${facultyRes.body.token}`);

    const returnedIds = res.body.assignedStudents.map((student) => student._id);

    expect(res.statusCode).toEqual(200);
    expect(returnedIds).toContain(cseStudent._id.toString());
    expect(returnedIds).toContain(eceStudent._id.toString());
    expect(returnedIds).not.toContain(otherStudent._id.toString());
    expect(res.body.totalStudents).toEqual(2);
    expect(res.body.classCount).toEqual(2);
  });

  it('returns students from faculty handled department and section', async () => {
    const subject = await Subject.create({ name: 'Database Systems', code: 'CS303' });
    const facultyRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Swetha', email: 'swetha@test.com', password: 'password', role: 'faculty' });

    await User.findByIdAndUpdate(facultyRes.body._id, {
      department: 'CS',
      handledSections: ['A'],
      handledSubjects: [subject._id]
    });

    const assignedStudent = await Student.create({
      name: 'Ramya L',
      roll_no: 'CS2023002',
      department: 'CS',
      semester: 1,
      section: 'A'
    });

    const otherSectionStudent = await Student.create({
      name: 'Other Section',
      roll_no: 'CS2023003',
      department: 'CS',
      semester: 1,
      section: 'B'
    });

    const otherDepartmentStudent = await Student.create({
      name: 'Other Department',
      roll_no: 'IT2023001',
      department: 'IT',
      semester: 1,
      section: 'A'
    });

    const res = await request(app)
      .get('/api/dashboard/kpis')
      .set('Authorization', `Bearer ${facultyRes.body.token}`);

    const returnedIds = res.body.assignedStudents.map((student) => student._id);

    expect(res.statusCode).toEqual(200);
    expect(returnedIds).toContain(assignedStudent._id.toString());
    expect(returnedIds).not.toContain(otherSectionStudent._id.toString());
    expect(returnedIds).not.toContain(otherDepartmentStudent._id.toString());
    expect(res.body.totalStudents).toEqual(1);
  });
});
