import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BarChart2,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  Layers,
  Megaphone,
  Plus,
  RefreshCcw,
  Save,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '../components/Loader';
import dashboardService from '../services/dashboardService';
import subjectService from '../services/subjectService';
import userService from '../services/userService';
import useAuth from '../hooks/useAuth';

const GRADE_COLORS = {
  O: '#4f46e5',
  'A+': '#7c3aed',
  A: '#0891b2',
  'B+': '#059669',
  B: '#f59e0b',
  C: '#64748b',
  F: '#e11d48',
};
const DEPARTMENTS = ['CS', 'CSE', 'IT', 'ECE', 'EC', 'ME', 'CE', 'EE', 'CH'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B', 'C'];

const StatCard = ({ title, value, icon: Icon, tone, caption }) => (
  <div className="flex min-h-[74px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-0.5 text-2xl font-bold leading-none text-slate-900">{value}</p>
      {caption && <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{caption}</p>}
    </div>
  </div>
);

const EmptyPanel = ({ text }) => (
  <div className="flex h-full min-h-[96px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-sm font-medium text-slate-400">
    {text}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('Semester');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [assignToast, setAssignToast] = useState('');
  const [quickAssign, setQuickAssign] = useState({
    department: 'CS',
    semester: '1',
    section: 'A',
    subject: '',
    faculty: '',
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

  const gradeData = useMemo(() => {
    const fallback = ['O', 'A+', 'A', 'B+', 'B', 'F'].map((grade) => ({ grade, count: 0 }));
    const source = Array.isArray(kpis?.gradeDistribution) ? kpis.gradeDistribution : fallback;
    const scale = { Week: 0.35, Month: 0.7, Semester: 1 }[range] || 1;
    return source
      .map((item) => ({ ...item, count: Math.round((item.count || 0) * scale) }))
      .filter((item) => selectedGrade === 'All' || item.grade === selectedGrade);
  }, [kpis?.gradeDistribution, range, selectedGrade]);

  const gradeTotal = gradeData.reduce((sum, item) => sum + item.count, 0);
  const passCount = kpis?.passCount || 0;
  const failCount = kpis?.failCount || 0;
  const pieData = [
    { name: 'Pass', value: passCount },
    { name: 'Fail', value: failCount },
  ];

  const stats = {
    admin: [
      { title: 'Students', value: kpis?.totalStudents ?? '-', icon: Users, tone: 'bg-indigo-600', caption: `${kpis?.pendingCount || 0} pending marks` },
      { title: 'Avg Score', value: kpis?.averageScore ?? '-', icon: TrendingUp, tone: 'bg-emerald-600', caption: `${kpis?.markCount || 0} mark entries` },
      { title: 'Pass Rate', value: `${kpis?.passPercentage ?? 0}%`, icon: Award, tone: 'bg-violet-600', caption: `${passCount} passed` },
      { title: 'Failed', value: failCount, icon: UserX, tone: 'bg-rose-600', caption: 'distinct students' },
    ],
    faculty: [
      { title: 'My Students', value: kpis?.totalStudents ?? '-', icon: Users, tone: 'bg-indigo-600', caption: `${kpis?.classCount || 0} classes` },
      { title: 'Avg Score', value: kpis?.averageScore ?? '-', icon: TrendingUp, tone: 'bg-emerald-600', caption: `${kpis?.markCount || 0} mark entries` },
      { title: 'Pass Rate', value: `${kpis?.passPercentage ?? 0}%`, icon: Award, tone: 'bg-violet-600', caption: `${passCount} passed` },
      { title: 'Failed', value: failCount, icon: UserX, tone: 'bg-rose-600', caption: `${kpis?.pendingCount || 0} pending` },
    ],
    student: [
      { title: 'My Profile', value: kpis?.totalStudents ? 'Active' : 'Missing', icon: UserCheck, tone: 'bg-indigo-600', caption: `${kpis?.classCount || 0} classes` },
      { title: 'Avg Score', value: kpis?.averageScore ?? '-', icon: TrendingUp, tone: 'bg-emerald-600', caption: `${kpis?.markCount || 0} subjects marked` },
      { title: 'Pass Rate', value: `${kpis?.passPercentage ?? 0}%`, icon: Award, tone: 'bg-violet-600', caption: `${passCount} passed subjects` },
      { title: 'Failed', value: failCount, icon: UserX, tone: 'bg-rose-600', caption: `${kpis?.pendingCount || 0} pending` },
    ],
  }[user?.role] || [];

  const quickActions = [
    { label: 'Add Student', to: '/students/add', icon: Plus, color: 'bg-indigo-600 hover:bg-indigo-700', roles: ['admin'] },
    { label: 'Students', to: '/students', icon: Users, color: 'bg-sky-600 hover:bg-sky-700', roles: ['admin', 'faculty'] },
    { label: 'Enter Marks', to: '/marks/entry', icon: ClipboardList, color: 'bg-emerald-600 hover:bg-emerald-700', roles: ['faculty'] },
    { label: 'Reports', to: '/reports', icon: BarChart2, color: 'bg-violet-600 hover:bg-violet-700', roles: ['admin', 'faculty'] },
    { label: 'Report Card', to: '/reports/my-report', icon: FileText, color: 'bg-violet-600 hover:bg-violet-700', roles: ['student'] },
  ].filter((item) => item.roles.includes(user?.role));

  const assignmentGroups = (kpis?.assignedSubjects || []).reduce((acc, assignment) => {
    const key = `${assignment.department} / Sem ${assignment.semester} / ${assignment.section}`;
    acc[key] = acc[key] || [];
    acc[key].push(assignment);
    return acc;
  }, {});
  const assignmentEntries = Object.entries(assignmentGroups).slice(0, 3);
  const assignedStudents = (kpis?.assignedStudents || []).slice(0, 5);

  const showAssignToast = (message) => {
    setAssignToast(message);
    setTimeout(() => setAssignToast(''), 2500);
  };

  const saveQuickAssignment = async () => {
    if (!quickAssign.subject || !quickAssign.faculty) {
      showAssignToast('Select subject and faculty.');
      return;
    }

    setAssigning(true);
    try {
      await subjectService.bulkAssign({
        department: quickAssign.department,
        semester: Number(quickAssign.semester),
        section: quickAssign.section,
        assignments: [{ subject: quickAssign.subject, faculty: quickAssign.faculty }],
      });
      showAssignToast('Assignment saved.');
      loadDashboard();
    } catch (err) {
      showAssignToast(err?.response?.data?.message || 'Failed to save assignment.');
    } finally {
      setAssigning(false);
    }
  };

  const roleTools = {
    admin: [
      { label: 'Subjects', icon: BookOpen, to: '/subjects' },
      { label: 'Faculty', icon: UserCheck, to: '/faculty' },
      { label: 'Bulk Import', icon: Layers, to: '/marks/import' },
    ],
    faculty: [
      { label: 'Attendance', icon: CalendarCheck, to: '/students' },
      { label: 'Mark List', icon: ClipboardList, to: '/marks' },
      { label: 'Reports', icon: TrendingUp, to: '/reports' },
    ],
    student: [
      { label: 'Subjects', icon: BookOpen, to: '/reports/my-report' },
      { label: 'Attendance', icon: CalendarCheck, to: '/profile' },
      { label: 'Announcements', icon: Megaphone, to: '/profile' },
    ],
  }[user?.role] || [];

  return (
    <div className="h-[calc(100vh-154px)] max-w-7xl overflow-hidden">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold leading-tight text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-500">
              Welcome back, <span className="font-semibold text-indigo-600">{user?.name}</span>
            </p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {['Week', 'Month', 'Semester'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === option ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[74px]" />)
            : stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </div>

        {!loading && (
          <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">
            <section className="col-span-8 flex min-h-0 flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Grade Distribution</h3>
                  <p className="text-xs text-slate-400">{gradeTotal} records shown</p>
                </div>
                <div className="flex gap-1">
                  {['All', ...(kpis?.gradeDistribution || []).map((item) => item.grade)].map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setSelectedGrade(grade)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        selectedGrade === grade ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeData} barCategoryGap="35%">
                    <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(15,23,42,0.12)' }} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(item) => setSelectedGrade(item.grade)}>
                      {gradeData.map((item) => <Cell key={item.grade} fill={GRADE_COLORS[item.grade] || '#64748b'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {selectedGrade !== 'All' && (
                <button type="button" onClick={() => setSelectedGrade('All')} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </section>

            <section className="col-span-4 flex min-h-0 flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">Pass vs Fail</h3>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius="52%" outerRadius="78%" paddingAngle={3} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Legend iconType="circle" iconSize={9} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(15,23,42,0.12)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="col-span-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(({ label, to, icon: Icon, color }) => (
                  <Link key={label} to={to} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm ${color}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {roleTools.map(({ label, icon: Icon, to }) => (
                  <Link key={label} to={to} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">
                    <Icon className="h-4 w-4 text-indigo-500" />
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="col-span-8 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              {assignToast && <div className="fixed right-4 top-4 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">{assignToast}</div>}
              {user?.role === 'admin' ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Quick Faculty Assignment</h3>
                      <p className="text-xs text-slate-400">Assign one subject to one class without leaving dashboard.</p>
                    </div>
                    <button
                      type="button"
                      onClick={saveQuickAssignment}
                      disabled={assigning}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {assigning ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <select value={quickAssign.department} onChange={(e) => setQuickAssign((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={quickAssign.semester} onChange={(e) => setQuickAssign((prev) => ({ ...prev, semester: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {SEMESTERS.map((item) => <option key={item} value={item}>Sem {item}</option>)}
                    </select>
                    <select value={quickAssign.section} onChange={(e) => setQuickAssign((prev) => ({ ...prev, section: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {SECTIONS.map((item) => <option key={item} value={item}>Section {item}</option>)}
                    </select>
                    <select value={quickAssign.subject} onChange={(e) => setQuickAssign((prev) => ({ ...prev, subject: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Subject</option>
                      {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                    </select>
                    <select value={quickAssign.faculty} onChange={(e) => setQuickAssign((prev) => ({ ...prev, faculty: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Faculty</option>
                      {faculty.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
                    </select>
                  </div>
                </>
              ) : user?.role === 'faculty' ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">My Assigned Students</h3>
                      <p className="text-xs text-slate-400">Only students assigned to you are counted here.</p>
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{kpis?.assignedStudents?.length || 0} students</span>
                  </div>
                  {assignedStudents.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {assignedStudents.map((student) => (
                        <Link key={student._id} to={`/students/${student._id}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-indigo-50">
                          <span className="min-w-0 truncate font-semibold text-slate-700">{student.name}</span>
                          <span className="text-xs text-slate-400">Sem {student.semester} {student.section}</span>
                        </Link>
                      ))}
                    </div>
                  ) : <EmptyPanel text="No assigned students yet." />}
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">My Classes</h3>
                      <p className="text-xs text-slate-400">Subjects and faculty assigned to your class.</p>
                    </div>
                    <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{kpis?.classCount || 0} classes</span>
                  </div>
                  {assignmentEntries.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {assignmentEntries.flatMap(([, assignments]) => assignments.slice(0, 2)).slice(0, 4).map((assignment) => (
                        <div key={assignment._id} className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="truncate text-sm font-bold text-slate-700">{assignment.subject?.name || 'Subject'}</p>
                          <p className="truncate text-xs text-slate-400">{assignment.faculty?.name || 'Faculty'}</p>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyPanel text="No class assignments yet." />}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
