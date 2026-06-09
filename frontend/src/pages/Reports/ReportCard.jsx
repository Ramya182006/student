import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Printer, UserRound, BookOpen, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import { Skeleton } from '../../components/Loader';
import studentService from '../../services/studentService';
import markService from '../../services/markService';

const gradeTone = (grade) => {
  const map = {
    O: 'bg-indigo-100 text-indigo-700',
    'A+': 'bg-violet-100 text-violet-700',
    A: 'bg-cyan-100 text-cyan-700',
    'B+': 'bg-emerald-100 text-emerald-700',
    B: 'bg-teal-100 text-teal-700',
    F: 'bg-rose-100 text-rose-700',
  };
  return map[grade] || 'bg-amber-100 text-amber-700';
};

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const ReportCard = () => {
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    studentService
      .getStudents()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.students || [];
        setStudents(list);
        if (list[0]?._id) setSelectedId(list[0]._id);
      })
      .catch(() => setError('Failed to load students.'))
      .finally(() => setLoadingList(false));
  }, []);

  const loadReport = useCallback((id) => {
    if (!id) return;
    const fallbackStudent = students.find((item) => item._id === id);
    if (fallbackStudent) setStudent(fallbackStudent);
    setLoadingReport(true);
    setError('');

    Promise.all([
      studentService.getStudentById(id).catch(() => fallbackStudent || null),
      markService.getMarkEntries().catch(() => []),
    ])
      .then(([studentData, allMarks]) => {
        const resolvedStudent = studentData || fallbackStudent;
        if (resolvedStudent) {
          setStudent(resolvedStudent);
          setAssignedSubjects(Array.isArray(resolvedStudent.assignedSubjects) ? resolvedStudent.assignedSubjects : []);
        }
        const studentMarks = (Array.isArray(allMarks) ? allMarks : []).filter((mark) => {
          const studentId = mark.student_id?._id || mark.student_id;
          return studentId === id;
        });
        setMarks(studentMarks);
      })
      .catch(() => setError('Failed to load report card.'))
      .finally(() => setLoadingReport(false));
  }, [students]);

  useEffect(() => {
    if (selectedId) loadReport(selectedId);
  }, [selectedId, loadReport]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((item) =>
      item.name?.toLowerCase().includes(q) ||
      item.roll_no?.toLowerCase().includes(q) ||
      item.department?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const rows = useMemo(() => {
    const uniqueAssignments = [];
    const seenSubjectIds = new Set();

    assignedSubjects.forEach((assignment) => {
      const subjectId = assignment.subject?._id || assignment.subject;
      if (!subjectId || seenSubjectIds.has(subjectId.toString())) return;
      seenSubjectIds.add(subjectId.toString());
      uniqueAssignments.push(assignment);
    });

    const markBySubject = marks.reduce((acc, mark) => {
      const subjectId = mark.subject_id?._id || mark.subject_id;
      if (subjectId) acc[subjectId] = mark;
      return acc;
    }, {});

    if (uniqueAssignments.length) {
      return uniqueAssignments.map((assignment) => {
        const subjectId = assignment.subject?._id || assignment.subject;
        return {
          id: assignment._id || subjectId,
          subject: assignment.subject,
          faculty: assignment.faculty,
          mark: markBySubject[subjectId],
        };
      });
    }

    return marks.map((mark) => ({
      id: mark._id,
      subject: mark.subject_id,
      faculty: mark.entered_by,
      mark,
    }));
  }, [assignedSubjects, marks]);

  const enteredRows = rows.filter((row) => row.mark);
  const totalScore = enteredRows.reduce((sum, row) => sum + (Number(row.mark?.total) || 0), 0);
  const average = enteredRows.length ? (totalScore / enteredRows.length).toFixed(1) : '0';
  const failedCount = enteredRows.filter((row) => row.mark?.grade === 'F').length;
  const pendingCount = rows.filter((row) => !row.mark).length;
  const passedCount = enteredRows.filter((row) => row.mark?.grade && row.mark.grade !== 'F').length;
  const overall = failedCount > 0 ? 'Fail' : enteredRows.length > 0 && pendingCount === 0 ? 'Pass' : 'Pending';

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Report Cards</h2>
          <p className="text-slate-500 text-sm mt-0.5">Select a student and review performance</p>
        </div>
        <button
          type="button"
          disabled={!student}
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 no-print"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <aside className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden no-print">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="p-3 border-b lg:border-b-0 lg:border-r border-slate-100">
              <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto p-3">
            {loadingList ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 min-w-[180px]" />
              ))
            ) : filteredStudents.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">No students found.</p>
            ) : (
              filteredStudents.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedId(item._id)}
                  className={`min-w-[210px] rounded-xl px-3 py-2 text-left transition-colors ${
                    selectedId === item._id ? 'bg-indigo-50 ring-1 ring-indigo-100' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                      {initials(item.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 truncate">{item.roll_no} / {item.department}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          {!selectedId ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
              Select a student to view report card.
            </div>
          ) : loadingReport ? (
            <div className="space-y-3">
              <Skeleton className="h-40" />
              <Skeleton className="h-64" />
            </div>
          ) : student ? (
            <div id="report-card-content" className="space-y-4 print-card">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">
                      {initials(student.name)}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Student Report Card</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-900">{student.name}</h3>
                      <p className="text-sm text-slate-500">{student.roll_no}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      ['Dept', student.department],
                      ['Semester', `Sem ${student.semester}`],
                      ['Section', student.section || '-'],
                      ['Admission', student.admission_year || '-'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                        <p className="mt-1 font-bold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <SummaryCard label="Subjects" value={rows.length} icon={BookOpen} tone="bg-indigo-50 text-indigo-700" />
                <SummaryCard label="Pass" value={passedCount} icon={CheckCircle} tone="bg-emerald-50 text-emerald-700" />
                <SummaryCard label="Fail" value={failedCount} icon={XCircle} tone="bg-rose-50 text-rose-700" />
                <SummaryCard label="Pending" value={pendingCount} icon={Clock3} tone="bg-amber-50 text-amber-700" />
                <SummaryCard label="Average" value={average} icon={UserRound} tone="bg-violet-50 text-violet-700" />
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div>
                    <h4 className="font-bold text-slate-800">Subject Performance</h4>
                    <p className="text-xs text-slate-400">Each subject keeps its own faculty and result</p>
                  </div>
                  <span className={`rounded-xl px-3 py-1 text-sm font-black ${
                    overall === 'Pass'
                      ? 'bg-emerald-100 text-emerald-700'
                      : overall === 'Fail'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {overall}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <p className="p-10 text-center text-slate-400">No subjects assigned yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {rows.map((row, index) => (
                      <SubjectRow key={row.id || index} row={row} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
              Report unavailable for this student.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-xl font-black text-slate-900">{value}</p>
      </div>
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
  </div>
);

const SubjectRow = ({ row }) => {
  const mark = row.mark;
  const grade = mark?.grade || 'Pending';
  const passed = mark?.grade && mark.grade !== 'F';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1.1fr_0.8fr] gap-3 px-4 py-3 items-center hover:bg-slate-50/70">
      <div>
        <p className="font-bold text-slate-900">{row.subject?.name || 'Subject pending'}</p>
        <p className="text-sm text-slate-400">{row.subject?.code || '-'}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Faculty</p>
        <p className="mt-1 font-semibold text-slate-700">{row.faculty?.name || 'Faculty pending'}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ScoreBox label="Internal" value={mark?.internal_marks ?? '-'} />
        <ScoreBox label="External" value={mark?.external_marks ?? '-'} />
        <ScoreBox label="Total" value={mark?.total ?? '-'} strong />
      </div>
      <div className="flex items-center lg:justify-end gap-3">
        <span className={`rounded-xl px-3 py-1 text-sm font-black ${gradeTone(mark?.grade)}`}>
          {grade}
        </span>
        {mark && (
          <span className={`text-sm font-bold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
            {passed ? 'Pass' : 'Fail'}
          </span>
        )}
      </div>
    </div>
  );
};

const ScoreBox = ({ label, value, strong = false }) => (
  <div className={`rounded-xl px-2.5 py-2 text-center ${strong ? 'bg-indigo-50' : 'bg-slate-50'}`}>
    <p className={`text-xs font-bold ${strong ? 'text-indigo-400' : 'text-slate-400'}`}>{label}</p>
    <p className={`mt-0.5 text-sm font-black ${strong ? 'text-indigo-700' : 'text-slate-800'}`}>{value}</p>
  </div>
);

export default ReportCard;
