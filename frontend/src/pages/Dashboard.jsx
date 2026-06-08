import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, ClipboardList, TrendingUp,
  UserX, UserCheck, Award, Plus, Upload, BarChart2, RefreshCcw, Layers, Megaphone, FileText, CalendarCheck, Save, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import KPIBox from '../components/KPIBox';
import { Skeleton } from '../components/Loader';
import dashboardService from '../services/dashboardService';
import subjectService from '../services/subjectService';
import userService from '../services/userService';
import useAuth from '../hooks/useAuth';

const GRADE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const DEPARTMENTS = ['CS', 'CSE', 'IT', 'ECE', 'EC', 'ME', 'CE', 'EE', 'CH'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B', 'C'];

const Dashboard = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [range, setRange] = useState('Semester');
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [assignToast, setAssignToast] = useState('');
  const [facultyStudentFilters, setFacultyStudentFilters] = useState({
    department: '',
    semester: '',
    section: '',
    subject: '',
  });
  const [bulkForm, setBulkForm] = useState({
    department: 'CSE',
    semester: '1',
    section: 'A',
    rows: [{ subject: '', faculty: '' }],
  });

  const loadDashboard = () => {
    setError('');
    setLoading(true);
    dashboardService
      .getKPIs()
      .then(setKpis)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    Promise.all([subjectService.getSubjects(), userService.getUsers({ role: 'faculty' })])
      .then(([subjectData, facultyData]) => {
        setSubjects(Array.isArray(subjectData) ? subjectData : []);
        setFaculty(Array.isArray(facultyData) ? facultyData : []);
      })
      .catch(() => {
        setSubjects([]);
        setFaculty([]);
      });
  }, [user?.role]);

  const showAssignToast = (message) => {
    setAssignToast(message);
    setTimeout(() => setAssignToast(''), 3000);
  };

  const updateBulkRow = (index, key, value) => {
    setBulkForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row),
    }));
  };

  const addBulkRow = () => {
    setBulkForm((prev) => ({ ...prev, rows: [...prev.rows, { subject: '', faculty: '' }] }));
  };

  const removeBulkRow = (index) => {
    setBulkForm((prev) => ({
      ...prev,
      rows: prev.rows.length === 1 ? prev.rows : prev.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const saveBulkAssignment = async () => {
    const assignments = bulkForm.rows.filter((row) => row.subject && row.faculty);
    if (!bulkForm.department || !bulkForm.semester || !bulkForm.section || assignments.length === 0) {
      showAssignToast('Select class, subject, and faculty before saving.');
      return;
    }

    setAssigning(true);
    try {
      await subjectService.bulkAssign({
        department: bulkForm.department,
        semester: Number(bulkForm.semester),
        section: bulkForm.section,
        assignments,
      });
      showAssignToast('Assignment saved. Faculty dashboard will show only these class students.');
      loadDashboard();
    } catch (err) {
      showAssignToast(err?.response?.data?.message || 'Failed to save assignment.');
    } finally {
      setAssigning(false);
    }
  };

  // Build grade distribution chart data from KPIs (mocked structure as backend returns summary)
  const gradeData = [
    { grade: 'O', count: 12 },
    { grade: 'A+', count: 25 },
    { grade: 'A', count: 30 },
    { grade: 'B+', count: 20 },
    { grade: 'B', count: 8 },
    { grade: 'F', count: kpis?.failCount ?? 5 },
  ];
  const rangeScale = { Week: 0.35, Month: 0.7, Semester: 1 };
  const visibleGradeData = gradeData
    .map((item) => ({ ...item, count: Math.max(0, Math.round(item.count * rangeScale[range])) }))
    .filter((item) => selectedGrade === 'All' || item.grade === selectedGrade);
  const selectedTotal = visibleGradeData.reduce((sum, item) => sum + item.count, 0);

  const pieData = [
    { name: 'Pass', value: kpis ? kpis.totalStudents - kpis.failCount : 0 },
    { name: 'Fail', value: kpis?.failCount ?? 0 },
  ];

  const quickActions = [
    { label: 'Add Student', to: '/students/add', icon: Plus, color: 'bg-indigo-600 hover:bg-indigo-700', roles: ['admin'] },
    { label: 'Bulk Assign', to: '/subjects', icon: Layers, color: 'bg-cyan-600 hover:bg-cyan-700', roles: ['admin'] },
    { label: 'Enter Marks', to: '/marks/entry', icon: ClipboardList, color: 'bg-emerald-600 hover:bg-emerald-700', roles: ['faculty'] },
    { label: 'View Reports', to: '/reports', icon: BarChart2, color: 'bg-violet-600 hover:bg-violet-700', roles: ['admin', 'faculty'] },
  ].filter(a => !a.roles || a.roles.includes(user?.role));

  const assignmentGroups = (kpis?.assignedSubjects || []).reduce((acc, assignment) => {
    const key = `${assignment.department}-Semester ${assignment.semester}-${assignment.section}`;
    acc[key] = acc[key] || [];
    acc[key].push(assignment);
    return acc;
  }, {});

  const facultySubjectOptions = (kpis?.assignedSubjects || []).filter((assignment, index, assignments) => {
    const subjectId = assignment.subject?._id || assignment.subject;
    return subjectId && assignments.findIndex((item) => (item.subject?._id || item.subject) === subjectId) === index;
  });

  const filteredFacultyStudents = (kpis?.assignedStudents || []).filter((student) => {
    const matchesClass =
      (!facultyStudentFilters.department || student.department === facultyStudentFilters.department) &&
      (!facultyStudentFilters.semester || Number(student.semester) === Number(facultyStudentFilters.semester)) &&
      (!facultyStudentFilters.section || student.section === facultyStudentFilters.section);

    if (!matchesClass) return false;
    if (!facultyStudentFilters.subject) return true;

    return (kpis?.assignedSubjects || []).some((assignment) => {
      const subjectId = assignment.subject?._id || assignment.subject;
      return (
        subjectId === facultyStudentFilters.subject &&
        assignment.department === student.department &&
        (assignment.semester === 'All' || Number(assignment.semester) === Number(student.semester)) &&
        assignment.section === student.section
      );
    });
  });

  const filteredStudentGroups = filteredFacultyStudents.reduce((acc, student) => {
    const key = `${student.department}-Semester ${student.semester}-${student.section || 'No Section'}`;
    acc[key] = acc[key] || [];
    acc[key].push(student);
    return acc;
  }, {});

  const roleTools = {
    admin: [
      { label: 'Manage Departments', icon: Layers },
      { label: 'Create Semesters & Classes', icon: BookOpen },
      { label: 'Generate Student Credentials', icon: Users },
      { label: 'Bulk Assign Faculty', icon: UserCheck },
    ],
    faculty: [
      { label: 'Mark Attendance', icon: CalendarCheck },
      { label: 'Enter Marks', icon: ClipboardList },
      { label: 'Upload Notes', icon: FileText },
      { label: 'Class Analytics', icon: TrendingUp },
    ],
    student: [
      { label: 'View Subjects & Faculty', icon: BookOpen },
      { label: 'View Attendance', icon: CalendarCheck },
      { label: 'Download Notes', icon: FileText },
      { label: 'Announcements', icon: Megaphone },
    ],
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Welcome back, <span className="font-semibold text-indigo-600">{user?.name}</span>
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {['Week', 'Month', 'Semester'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  range === option ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KPIBox
              title="Total Students"
              value={kpis?.totalStudents ?? '—'}
              icon={Users}
              gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
            />
            <KPIBox
              title="Average Score"
              value={kpis?.averageScore !== undefined ? `${kpis.averageScore}` : '—'}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            />
            <KPIBox
              title="Pass Rate"
              value={kpis?.passPercentage !== undefined ? `${kpis.passPercentage}%` : '—'}
              icon={Award}
              gradient="bg-gradient-to-br from-violet-500 to-purple-700"
            />
            <KPIBox
              title="Students Failed"
              value={kpis?.failCount ?? '—'}
              icon={UserX}
              gradient="bg-gradient-to-br from-rose-500 to-rose-700"
            />
          </>
        )}
      </div>

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade Distribution Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-700">Grade Distribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedGrade === 'All' ? `${selectedTotal} records shown` : `${selectedGrade} grade selected`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['All', ...gradeData.map((g) => g.grade)].map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      selectedGrade === grade ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={visibleGradeData} barCategoryGap="30%">
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(item) => setSelectedGrade(item.grade)}>
                  {visibleGradeData.map((_, i) => (
                    <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {selectedGrade !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedGrade('All')}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reset chart
              </button>
            )}
          </div>

          {/* Pass/Fail Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-base font-semibold text-slate-700 mb-4">Pass vs Fail</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend iconType="circle" iconSize={10} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-base font-semibold text-slate-700 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {quickActions.map(({ label, to, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-5 py-2.5 ${color} text-white text-sm font-medium rounded-xl transition-colors shadow-sm`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && user?.role === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {assignToast && (
            <div className="fixed top-4 right-4 z-50 rounded-xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl">
              {assignToast}
            </div>
          )}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                Assign Faculty To Class Students
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Pick one class, assign subjects and faculty. Faculty dashboard will show only students from those assigned classes.
              </p>
            </div>
            <button
              type="button"
              onClick={saveBulkAssignment}
              disabled={assigning}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {assigning ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Assignment
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Department</span>
              <select
                value={bulkForm.department}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, department: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Semester</span>
              <select
                value={bulkForm.semester}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, semester: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SEMESTERS.map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Class / Section</span>
              <select
                value={bulkForm.section}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, section: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SECTIONS.map((section) => <option key={section} value={section}>Section {section}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {bulkForm.rows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 rounded-xl bg-slate-50 p-3">
                <select
                  value={row.subject}
                  onChange={(e) => updateBulkRow(index, 'subject', e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>{subject.name} ({subject.code})</option>
                  ))}
                </select>
                <select
                  value={row.faculty}
                  onChange={(e) => updateBulkRow(index, 'faculty', e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select faculty</option>
                  {faculty.map((member) => (
                    <option key={member._id} value={member._id}>{member.name} {member.department ? `- ${member.department}` : ''}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeBulkRow(index)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addBulkRow}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Subject
          </button>
        </div>
      )}

      {!loading && user?.role === 'faculty' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-700">My Assigned Students</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Students shown here come only from classes and subjects assigned by Admin.
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {filteredFacultyStudents.length} / {kpis?.assignedStudents?.length || 0} students
            </span>
          </div>

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={facultyStudentFilters.department}
              onChange={(event) => setFacultyStudentFilters((prev) => ({ ...prev, department: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Department</option>
              {[...new Set((kpis?.assignedStudents || []).map((student) => student.department).filter(Boolean))].map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <select
              value={facultyStudentFilters.semester}
              onChange={(event) => setFacultyStudentFilters((prev) => ({ ...prev, semester: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semester</option>
              {[...new Set((kpis?.assignedStudents || []).map((student) => student.semester).filter(Boolean))].sort((a, b) => Number(a) - Number(b)).map((semester) => (
                <option key={semester} value={semester}>Semester {semester}</option>
              ))}
            </select>
            <select
              value={facultyStudentFilters.section}
              onChange={(event) => setFacultyStudentFilters((prev) => ({ ...prev, section: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Section</option>
              {[...new Set((kpis?.assignedStudents || []).map((student) => student.section).filter(Boolean))].map((section) => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
            <select
              value={facultyStudentFilters.subject}
              onChange={(event) => setFacultyStudentFilters((prev) => ({ ...prev, subject: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Subject</option>
              {facultySubjectOptions.map((assignment) => (
                <option key={assignment.subject?._id || assignment.subject} value={assignment.subject?._id || assignment.subject}>
                  {assignment.subject?.name || 'Subject'}
                </option>
              ))}
            </select>
          </div>

          {Object.values(facultyStudentFilters).some(Boolean) && (
            <button
              type="button"
              onClick={() => setFacultyStudentFilters({ department: '', semester: '', section: '', subject: '' })}
              className="mb-4 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Clear filters
            </button>
          )}

          {Object.keys(filteredStudentGroups).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              No students found for the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {Object.entries(filteredStudentGroups).map(([className, students]) => (
                <div key={className} className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                    <h4 className="font-bold text-slate-800">{className}</h4>
                    <span className="text-xs font-semibold text-slate-400">{students.length} students</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {students.map((student) => (
                      <div key={student._id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-indigo-50/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(student.name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                            <p className="text-xs text-slate-400 truncate">{student.roll_no}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-slate-600">{student.department}</p>
                          <p className="text-xs text-slate-400">Sem {student.semester} {student.section || ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-700">
                  {user?.role === 'admin' ? 'Class Assignment Map' : 'My Assigned Classes'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subject and faculty assignments are applied by department, semester, and class.
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {kpis?.classCount || 0} classes
              </span>
            </div>

            {Object.keys(assignmentGroups).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                No class assignments yet.
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(assignmentGroups).map(([className, assignments]) => (
                  <div key={className} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-bold text-slate-800">{className}</h4>
                      <span className="text-xs font-semibold text-slate-400">{assignments.length} subjects</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignments.map((assignment) => (
                        <span key={assignment._id} className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          {assignment.subject?.name || 'Subject'}
                          <span className="text-slate-300">/</span>
                          {assignment.faculty?.name || 'Faculty'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-base font-semibold text-slate-700 mb-4">
              {user?.role === 'admin' ? 'Admin Controls' : user?.role === 'faculty' ? 'Faculty Workspace' : 'Student Workspace'}
            </h3>
            <div className="space-y-3">
              {(roleTools[user?.role] || []).map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
                  <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
