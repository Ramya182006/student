import React, { useEffect, useState } from 'react';
import { BookOpen, Download, FileText, Lock, Megaphone, Printer, UserCheck } from 'lucide-react';
import { Skeleton } from '../../components/Loader';
import useAuth from '../../hooks/useAuth';
import studentService from '../../services/studentService';

const gradeColor = (grade) => {
  const map = {
    O: 'bg-indigo-100 text-indigo-700',
    'A+': 'bg-violet-100 text-violet-700',
    A: 'bg-cyan-100 text-cyan-700',
    'B+': 'bg-emerald-100 text-emerald-700',
    B: 'bg-teal-100 text-teal-700',
    F: 'bg-rose-100 text-rose-700',
  };
  return map[grade] || 'bg-slate-100 text-slate-700';
};

const StudentReport = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notPublished, setNotPublished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    studentService.getMyReport()
      .then((data) => {
        const reportStudent = data.student;
        setStudent(reportStudent || null);
        setMarks(Array.isArray(data.marks) ? data.marks : []);
        setAssignedSubjects(Array.isArray(data.assignedSubjects) ? data.assignedSubjects : []);
        setNotPublished(!reportStudent?.isPublished);
      })
      .catch((err) => setError(err?.response?.data?.message || 'Could not load your report card.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const totalScore = marks.reduce((sum, mark) => sum + (mark.total || 0), 0);
  const avgScore = marks.length ? (totalScore / marks.length).toFixed(1) : 0;
  const passed = marks.length > 0 && marks.every((mark) => mark.grade !== 'F');
  const markBySubject = marks.reduce((acc, mark) => {
    const subjectId = mark.subject_id?._id || mark.subject_id;
    if (subjectId) acc[subjectId] = mark;
    return acc;
  }, {});
  const uniqueAssignments = [];
  const seenSubjectIds = new Set();
  assignedSubjects.forEach((assignment) => {
    const subjectId = assignment.subject?._id || assignment.subject;
    if (!subjectId || seenSubjectIds.has(subjectId.toString())) return;
    seenSubjectIds.add(subjectId.toString());
    uniqueAssignments.push(assignment);
  });
  const subjectRows = assignedSubjects.length
    ? uniqueAssignments.map((assignment) => ({
        assignment,
        mark: markBySubject[assignment.subject?._id || assignment.subject],
      }))
    : marks.map((mark) => ({ assignment: null, mark }));

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) return <div className="text-center py-20 text-slate-400">{error}</div>;
  if (!student) return <div className="text-center py-20 text-slate-400">Student profile is not linked to this account.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Report Card</h2>
          <p className="text-slate-500 text-sm mt-0.5">Your class subjects, faculty, and marks</p>
        </div>
        <button
          id="student-print-btn"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors no-print"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {notPublished && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
          <Lock className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Report not published yet</p>
            <p>Your subjects are visible now. Marks will appear as each faculty enters them.</p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6">
        <div className="text-center mb-4">
          <p className="text-indigo-200 text-sm">EduPortal University</p>
          <h3 className="text-2xl font-bold mt-1">Academic Report Card</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Name', student.name],
            ['Roll No', student.roll_no],
            ['Department', student.department],
            ['Semester', `Sem ${student.semester}`],
            ['Section', student.section || 'N/A'],
            ['Admission', student.admission_year || 'N/A'],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-indigo-200 text-[10px] uppercase tracking-wide">{label}</p>
              <p className="font-bold text-sm mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <AssignedSubjectsPanel assignments={assignedSubjects} />

      {marks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <p className="text-3xl font-black text-indigo-600">{totalScore}</p>
            <p className="text-xs text-slate-500 mt-1">Total Score</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
            <p className="text-3xl font-black text-purple-600">{avgScore}</p>
            <p className="text-xs text-slate-500 mt-1">Avg per Subject</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-5 text-center ${passed ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            <p className={`text-2xl font-black ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
              {passed ? 'PASS' : 'FAIL'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Overall Result</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="font-semibold text-slate-700">Subject-wise Performance</h4>
        </div>
        {subjectRows.length === 0 ? (
          <p className="p-10 text-center text-slate-400">No subjects have been assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Subject', 'Code', 'Faculty', 'Internal', 'External', 'Total', 'Grade'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subjectRows.map(({ assignment, mark }, index) => (
                  <tr key={assignment?._id || mark?._id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700">{assignment?.subject?.name || mark?.subject_id?.name || '-'}</td>
                    <td className="px-5 py-3 text-slate-500">{assignment?.subject?.code || mark?.subject_id?.code || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{assignment?.faculty?.name || 'Faculty pending'}</td>
                    <td className="px-5 py-3 text-slate-600">{mark?.internal_marks ?? 'Pending'}</td>
                    <td className="px-5 py-3 text-slate-600">{mark?.external_marks ?? 'Pending'}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{mark?.total ?? '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeColor(mark?.grade)}`}>
                        {mark?.grade || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const AssignedSubjectsPanel = ({ assignments = [] }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h4 className="font-semibold text-slate-700">My Subjects & Faculty</h4>
        <p className="text-xs text-slate-400 mt-0.5">Assigned by your department, semester, and class</p>
      </div>
      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
        {assignments.length} subjects
      </span>
    </div>

    {assignments.length === 0 ? (
      <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        No subjects assigned yet.
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {assignments.map((assignment) => (
          <div key={assignment._id} className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-bold text-slate-800">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  {assignment.subject?.name || 'Subject'}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  {assignment.faculty?.name || 'Faculty pending'}
                </p>
              </div>
              <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                {assignment.subject?.code || '-'}
              </span>
            </div>
            <div className="mt-3 flex gap-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1"><FileText className="w-3 h-3" /> Notes</span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1"><Download className="w-3 h-3" /> Assignments</span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1"><Megaphone className="w-3 h-3" /> Alerts</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default StudentReport;
