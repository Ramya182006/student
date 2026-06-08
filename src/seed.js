/**
 * Seed Script – creates demo users (admin, faculty, student) and sample data
 * Run: node src/seed.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/userModel');
const Student = require('./models/studentModel');
const Subject = require('./models/subjectModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_portal';

const users = [
  { name: 'Admin User',    email: 'admin@uni.edu',   password: 'admin123',   role: 'admin', designation: 'System Administrator' },
  { name: 'Dr. Jane Smith', email: 'faculty@uni.edu', password: 'faculty123', role: 'faculty', department: 'CS', designation: 'Professor', phone: '+91 98765 43210' },
  { name: 'Dr. Raj Kumar', email: 'faculty2@uni.edu', password: 'faculty123', role: 'faculty', department: 'IT', designation: 'Associate Professor', phone: '+91 87654 32109' },
];

const subjects = [
  { name: 'Data Structures', code: 'CS301' },
  { name: 'Algorithms',      code: 'CS302' },
  { name: 'Database Systems', code: 'CS303' },
  { name: 'Operating Systems', code: 'CS304' },
  { name: 'Computer Networks', code: 'CS305' },
];

const studentData = [
  {
    name: 'Alice Johnson',
    roll_no: 'CS2023001',
    email: 'student@uni.edu',
    department: 'CS',
    semester: 5,
    section: 'A',
    admission_year: 2023,
    gender: 'Female',
    date_of_birth: '2004-02-14',
    phone: '+91 90000 10001',
    guardian_name: 'Robert Johnson',
    guardian_phone: '+91 98888 10001',
    address: '12 Lake View Road, Chennai',
    isPublished: true,
  },
  {
    name: 'Bob Williams',
    roll_no: 'CS2023002',
    email: 'bob@uni.edu',
    department: 'CS',
    semester: 5,
    section: 'A',
    admission_year: 2023,
    gender: 'Male',
    date_of_birth: '2004-06-21',
    phone: '+91 90000 10002',
    guardian_name: 'Mary Williams',
    guardian_phone: '+91 98888 10002',
    address: '45 Park Street, Chennai',
    isPublished: true,
  },
  {
    name: 'Carol Davis',
    roll_no: 'CS2023003',
    email: 'carol@uni.edu',
    department: 'IT',
    semester: 3,
    section: 'B',
    admission_year: 2024,
    gender: 'Female',
    date_of_birth: '2005-01-09',
    phone: '+91 90000 10003',
    guardian_name: 'Helen Davis',
    guardian_phone: '+91 98888 10003',
    address: '8 Tech Nagar, Coimbatore',
    isPublished: true,
  },
  {
    name: 'David Brown',
    roll_no: 'CS2023004',
    email: 'david@uni.edu',
    department: 'CS',
    semester: 5,
    section: 'C',
    admission_year: 2023,
    gender: 'Male',
    date_of_birth: '2004-11-03',
    phone: '+91 90000 10004',
    guardian_name: 'George Brown',
    guardian_phone: '+91 98888 10004',
    address: '19 College Main Road, Madurai',
    isPublished: true,
  },
  {
    name: 'Eva Martinez',
    roll_no: 'IT2023001',
    email: 'eva@uni.edu',
    department: 'IT',
    semester: 3,
    section: 'A',
    admission_year: 2024,
    gender: 'Female',
    date_of_birth: '2005-08-17',
    phone: '+91 90000 10005',
    guardian_name: 'Laura Martinez',
    guardian_phone: '+91 98888 10005',
    address: '31 Garden Avenue, Bengaluru',
    isPublished: true,
  },
];

// Student login user (role=student, linked to a Student profile)
const studentUser = {
  name: 'Alice Johnson',
  email: 'student@uni.edu',
  password: 'student123',
  role: 'student',
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    // ── Clean existing data ──────────────────────────────────────
    await User.deleteMany({});
    await Student.deleteMany({});
    await Subject.deleteMany({});
    console.log('🗑  Cleared existing users, students, subjects');

    // ── Create admin + faculty users ─────────────────────────────
    const createdUsers = await User.create(users);
    console.log(`👤 Created ${createdUsers.length} admin/faculty users`);

    const facultyUser = createdUsers.find(u => u.email === 'faculty@uni.edu');

    // ── Create subjects (assign first faculty) ───────────────────
    const subjectDocs = await Subject.create(
      subjects.map(s => ({ ...s, assignedFaculty: facultyUser._id }))
    );
    console.log(`📚 Created ${subjectDocs.length} subjects`);

    // ── Create student User account ──────────────────────────────
    const sUser = await User.create(studentUser);
    console.log(`🎓 Created student login: ${studentUser.email} / ${studentUser.password}`);

    // ── Create Student profiles ──────────────────────────────────
    const studentDocs = await Student.create(
      studentData.map((s, i) => ({
        ...s,
        // link first student to the user account so they can log in
        ...(i === 0 ? { user: sUser._id } : {}),
      }))
    );
    console.log(`🎓 Created ${studentDocs.length} student profiles`);

    // ── Summary ──────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 SEED COMPLETE — Demo credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin   → admin@uni.edu   / admin123');
    console.log('  Faculty → faculty@uni.edu / faculty123');
    console.log('  Student → student@uni.edu / student123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
