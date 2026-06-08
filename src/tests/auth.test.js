const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const Student = require('../models/studentModel');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/student_portal_test';

beforeAll(async () => {
  // Use a separate database for testing
  process.env.MONGO_URI = TEST_MONGO_URI;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

beforeEach(async () => {
  // Clear collections before each test
  await User.deleteMany({});
  await Student.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Authentication & Authorization APIs', () => {
  it('should register a new Admin user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'System Admin',
        email: 'admin@school.com',
        password: 'password123',
        role: 'admin'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.role).toEqual('admin');

    const userInDb = await User.findOne({ email: 'admin@school.com' });
    expect(userInDb).not.toBeNull();
  });

  it('should register a Student and create a Student profile link', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@student.com',
        password: 'password123',
        role: 'student',
        roll_no: 'S101',
        department: 'Computer Science',
        semester: 4
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');

    // Verify User in DB
    const userInDb = await User.findOne({ email: 'john@student.com' });
    expect(userInDb).not.toBeNull();

    // Verify Student Profile in DB
    const studentProfile = await Student.findOne({ roll_no: 'S101' });
    expect(studentProfile).not.toBeNull();
    expect(studentProfile.user.toString()).toEqual(userInDb._id.toString());
  });

  it('should fail registration if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bad@school.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(400);
  });

  it('should log in an existing user and return a JWT token', async () => {
    // Manually create user first
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Professor Snape',
        email: 'snape@faculty.com',
        password: 'password123',
        role: 'faculty'
      });

    // Login
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'snape@faculty.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toEqual('snape@faculty.com');
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Professor Snape',
        email: 'snape@faculty.com',
        password: 'password123',
        role: 'faculty'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'snape@faculty.com',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toEqual(401);
  });
});
