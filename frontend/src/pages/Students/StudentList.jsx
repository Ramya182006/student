import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  GraduationCap,
  AlertTriangle,
  Mail,
  Phone,
  RefreshCw,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import DataTable from '../../components/DataTable';
import SearchFilter from '../../components/SearchFilter';
import ConfirmModal from '../../components/ConfirmModal';
import studentService from '../../services/studentService';
import subjectService from '../../services/subjectService';
import userService from '../../services/userService';
import markService from '../../services/markService';
import useAuth from '../../hooks/useAuth';

const requiredProfileFields = [
  'name',
  'roll_no',
  'email',
  'department',
  'semester',
  'section',
  'admission_year',
  'gender',
  'date_of_birth',
  'phone',
  'guardian_name',
  'guardian_phone',
  'address',
];

const hasValue = (value) => String(value || '').trim().length > 0;

const profileCompletion = (student) => {
  const filled = requiredProfileFields.filter((field) => hasValue(student[field])).length;
  return Math.round((filled / requiredProfileFields.length) * 100);
};

const Badge = ({ value }) => {
  const map = {
    pass: 'bg-emerald-100 text-emerald-700',
    fail: 'bg-rose-100 text-rose-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[value] || 'bg-slate-100 text-slate-600'}`}>
      {value || 'pending'}
    </span>
  );
};

const Missing = ({ label = 'Missing' }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold">
    <AlertTriangle className="w-3 h-3" />
    {label}
  </span>
);

const StudentCell = ({ student }) => {
  const initials = (student.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
        {initials || '?'}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 break-words">{student.name}</p>
        <p className="text-xs text-slate-400 break-words">{student.roll_no}</p>
      </div>
    </div>
  );
};

const getStudentInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
    <span className="text-sm font-semibold text-slate-700 text-right break-words">{hasValue(value) ? value : '-'}</span>
  </div>
);

const AssignmentCell = ({ assignments, fallbackSubject, fallbackFaculty, currentUser, student, marks }) => {
  const findMark = (subjectId) => marks.find((mark) => {
    const markStudentId = mark.student_id?._id || mark.student_id;
    const markSubjectId = mark.subject_id?._id || mark.subject_id;
    return markStudentId === student?._id && markSubjectId === subjectId;
  });

  const rows = assignments.length
    ? assignments.map(({ subject, faculty }) => {
      const subjectId = subject?._id || subject;
      const mark = findMark(subjectId);
      return {
        key: subjectId || subject?.code || subject?.name,
        subjectLabel: subject?.name ? `${subject.name} (${subject.code})` : 'Subject pending',
        facultyLabel: faculty?.name || (currentUser?.role === 'faculty' ? currentUser.name : ''),
        mark,
      };
    })
    : fallbackSubject?.name
      ? [{
          key: fallbackSubject._id || fallbackSubject.code,
          subjectLabel: `${fallbackSubject.name} (${fallbackSubject.code})`,
          facultyLabel: fallbackFaculty?.name || (currentUser?.role === 'faculty' ? currentUser.name : ''),
          mark: findMark(fallbackSubject._id),
        }]
      : [];

  if (!rows.length) return <Missing label="Not assigned" />;

  return (
    <div className="min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-2">
      {rows.map((row, index) => (
        <div key={row.key || index} className="rounded-lg bg-slate-50 px-2.5 py-2 border border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-snug">{row.subjectLabel}</p>
              <p className={`mt-0.5 text-xs font-semibold ${row.facultyLabel ? 'text-emerald-600' : 'text-rose-500'}`}>
                {row.facultyLabel || 'Faculty not assigned'}
              </p>
            </div>
            <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-black ${
              row.mark?.grade === 'F'
                ? 'bg-rose-100 text-rose-700'
                : row.mark?.grade
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {row.mark?.grade || 'Pending'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const StudentList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyMembers, setFacultyMembers] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: '', semester: '', section: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [toast, setToast] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchStudents = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (filters.department) params.department = filters.department;
    if (filters.semester) params.semester = filters.semester;
    if (filters.section) params.section = filters.section;
    studentService
      .getStudents(params)
      .then((data) => setStudents(Array.isArray(data) ? data : data.students || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filters]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    Promise.all([
      subjectService.getSubjects(),
      userService.getUsers({ role: 'faculty' }).catch(() => []),
      markService.getMarkEntries().catch(() => []),
    ])
      .then(([subjectData, facultyData, markData]) => {
        setSubjects(Array.isArray(subjectData) ? subjectData : []);
        setFacultyMembers(Array.isArray(facultyData) ? facultyData : []);
        setMarks(Array.isArray(markData) ? markData : []);
      })
      .catch(() => {
        setSubjects([]);
        setFacultyMembers([]);
        setMarks([]);
      });
  }, []);

  const getClassAssignments = useCallback((student) => {
    const currentUserId = user?._id || user?.id;
    const classAssignments = subjects.flatMap((subject) =>
      (subject.classAssignments || [])
        .filter((assignment) =>
          assignment.department === student.department &&
          (assignment.semester === 'All' || Number(assignment.semester) === Number(student.semester)) &&
          assignment.section === student.section &&
          (isAdmin || !currentUserId || String(assignment.faculty?._id || assignment.faculty) === String(currentUserId))
        )
        .map((assignment) => ({
          subject,
          faculty: assignment.faculty || subject.assignedFaculty,
        }))
    );

    const profileAssignments = facultyMembers.flatMap((faculty) => {
      if (!isAdmin && currentUserId && String(faculty._id || faculty.id) !== String(currentUserId)) {
        return [];
      }
      const handlesClass =
        faculty.department === student.department &&
        (faculty.handledSections || []).includes(student.section);
      if (!handlesClass) return [];

      return (faculty.handledSubjects || []).map((handledSubject) => {
        const subjectId = handledSubject?._id || handledSubject;
        const subject = typeof handledSubject === 'object'
          ? handledSubject
          : subjects.find((item) => item._id === subjectId);
        return subject ? { subject, faculty } : null;
      }).filter(Boolean);
    });

    const bySubject = new Map();
    [...classAssignments, ...profileAssignments].forEach((assignment) => {
      const subjectId = assignment.subject?._id || assignment.subject;
      if (subjectId && !bySubject.has(subjectId)) bySubject.set(subjectId, assignment);
    });
    return [...bySubject.values()];
  }, [subjects, facultyMembers, isAdmin, user?._id, user?.id]);

  const getSubjectResultSummary = (student) => {
    const assignments = getClassAssignments(student);
    const subjectIds = assignments.map(({ subject }) => subject?._id || subject).filter(Boolean);
    const studentMarks = marks.filter((mark) => {
      const markStudentId = mark.student_id?._id || mark.student_id;
      const markSubjectId = mark.subject_id?._id || mark.subject_id;
      return markStudentId === student._id && (!subjectIds.length || subjectIds.includes(markSubjectId));
    });
    const fail = studentMarks.filter((mark) => mark.grade === 'F').length;
    const pass = studentMarks.filter((mark) => mark.grade && mark.grade !== 'F').length;
    const pending = Math.max(0, (subjectIds.length || studentMarks.length) - studentMarks.length);
    return { pass, fail, pending, total: subjectIds.length || studentMarks.length };
  };

  const getMarkForSubject = (student, subjectId) => marks.find((mark) => {
    const markStudentId = mark.student_id?._id || mark.student_id;
    const markSubjectId = mark.subject_id?._id || mark.subject_id;
    return markStudentId === student._id && markSubjectId === subjectId;
  });

  const formatSubjectAssignments = (student) => {
    const assignments = getClassAssignments(student);
    if (!assignments.length && student.subject?.name) {
      return `${student.subject.name} (${student.subject.code})`;
    }
    if (!assignments.length) return <Missing label="Not assigned" />;

    return (
      <div className="flex flex-col gap-1 max-w-[280px]">
        {assignments.slice(0, 3).map(({ subject }) => (
          <span key={subject._id} className="text-sm font-semibold text-slate-700 leading-snug">
            {subject.name} ({subject.code})
          </span>
        ))}
        {assignments.length > 3 && (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
            +{assignments.length - 3}
          </span>
        )}
      </div>
    );
  };

  const formatFacultyAssignments = (student) => {
    const assignments = getClassAssignments(student);
    const facultyNames = [...new Set(assignments.map(({ faculty }) => faculty?.name).filter(Boolean))];
    if (!facultyNames.length && student.assignedFaculty?.name) return student.assignedFaculty.name;
    if (!facultyNames.length) return <Missing label="Not assigned" />;

    return (
      <div className="flex flex-col gap-1 max-w-[220px]">
        {facultyNames.slice(0, 3).map((name) => (
          <span key={name} className="text-sm font-semibold text-emerald-700 leading-snug">
            {name}
          </span>
        ))}
        {facultyNames.length > 3 && (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
            +{facultyNames.length - 3}
          </span>
        )}
      </div>
    );
  };

  const displayStudents = useMemo(() => {
    const checks = {
      all: () => true,
      complete: (student) => profileCompletion(student) === 100,
      missing: (student) => profileCompletion(student) < 100,
      published: (student) => student.isPublished,
      draft: (student) => !student.isPublished,
    };
    return students.filter(checks[quickFilter] || checks.all);
  }, [students, quickFilter]);

  const completeCount = students.filter((student) => profileCompletion(student) === 100).length;
  const publishedCount = students.filter((student) => student.isPublished).length;
  const missingCount = students.length - completeCount;
  const draftCount = students.length - publishedCount;

  const resetFilters = () => {
    setSearch('');
    setFilters({ department: '', semester: '', section: '' });
    setQuickFilter('all');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await studentService.deleteStudent(deleteTarget._id);
      showToast(`${deleteTarget.name} deleted.`);
      setStudents((prev) => prev.filter((s) => s._id !== deleteTarget._id));
    } catch {
      showToast('Failed to delete student.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const togglePublish = async (student) => {
    const result = getSubjectResultSummary(student);
    if (!student.isPublished && (result.total === 0 || result.pending > 0)) {
      showToast(
        result.total === 0
          ? 'Cannot publish: no subjects assigned for this student.'
          : `Cannot publish: ${result.pending} subject marks are pending.`
      );
      return;
    }

    setPublishingId(student._id);
    try {
      if (student.isPublished) {
        await studentService.unpublishReportCard(student._id);
        showToast(`Report card unpublished for ${student.name}.`);
      } else {
        await studentService.publishReportCard(student._id);
        showToast(`Report card published for ${student.name}.`);
      }
      setStudents((prev) =>
        prev.map((s) => s._id === student._id ? { ...s, isPublished: !s.isPublished } : s)
      );
    } catch {
      showToast('Action failed.');
    } finally {
      setPublishingId(null);
    }
  };

  const baseColumns = [
    { key: 'roll_no', label: 'Roll No' },
    { key: 'name', label: 'Name', render: (_, row) => <StudentCell student={row} /> },
    { key: 'department', label: 'Department' },
    { key: 'semester', label: 'Sem' },
    { key: 'section', label: 'Section', render: (val) => hasValue(val) ? val : <Missing /> },
    {
      key: 'subject',
      label: 'Subject',
      render: (_, row) => formatSubjectAssignments(row),
    },
    {
      key: 'assignedFaculty',
      label: 'Faculty',
      render: (_, row) => formatFacultyAssignments(row),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (val) => hasValue(val)
        ? <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{val}</span>
        : <Missing />,
    },
  ];

  const facultyColumns = [
    { key: 'roll_no', label: 'Roll No' },
    { key: 'name', label: 'Student', render: (_, row) => <StudentCell student={row} /> },
    {
      key: 'class',
      label: 'Class',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.department}</p>
          <p className="text-xs font-medium text-slate-400">Sem {row.semester} / Section {row.section || '-'}</p>
        </div>
      ),
    },
    {
      key: 'assignment',
      label: 'Assignment',
      sortable: false,
      render: (_, row) => (
        <AssignmentCell
          assignments={getClassAssignments(row)}
          fallbackSubject={row.subject}
          fallbackFaculty={row.assignedFaculty}
          currentUser={user}
          student={row}
          marks={marks}
        />
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (val) => hasValue(val)
        ? <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{val}</span>
        : <Missing />,
    },
  ];

  const adminExtraColumns = [
    {
      key: 'email',
      label: 'Email',
      render: (val) => hasValue(val)
        ? <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{val}</span>
        : <Missing />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => <Badge value={row.status} />,
    },
    {
      key: 'completion',
      label: 'Profile',
      sortable: false,
      render: (_, row) => {
        const percent = profileCompletion(row);
        return (
          <div className="min-w-[120px]">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className={percent === 100 ? 'text-emerald-700' : 'text-amber-700'}>{percent}%</span>
              <span className="text-slate-400">{percent === 100 ? 'Complete' : 'Needs details'}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100">
              <div
                className={`h-1.5 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
          key: 'isPublished',
          label: 'Published',
          sortable: false,
          render: (val, row) => (
            <button
              onClick={() => togglePublish(row)}
              disabled={publishingId === row._id}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                val ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {val ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {val ? 'Published' : 'Draft'}
            </button>
          ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <Link
            to="#"
            onClick={(event) => {
              event.preventDefault();
              setSelectedStudent(row);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Link>
          {isAdmin && (
            <>
              <Link
                to={`/students/${row._id}/edit`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setDeleteTarget(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const facultyExtraColumns = [
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (_, row) => (
        <Link
          to="#"
          onClick={(event) => {
            event.preventDefault();
            setSelectedStudent(row);
          }}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 transition-colors"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </Link>
      ),
    },
  ];

  const cleanAdminColumns = [
    {
      key: 'student',
      label: 'Student',
      render: (_, row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {getStudentInitials(row.name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 break-words">{row.name}</p>
            <p className="text-sm text-slate-500 break-words">{row.roll_no}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.department || '-'}</p>
          <p className="text-xs font-medium text-slate-400">Sem {row.semester || '-'} / Section {row.section || '-'}</p>
        </div>
      ),
    },
    {
      key: 'assignment',
      label: 'Assignment',
      sortable: false,
      render: (_, row) => (
        <AssignmentCell
          assignments={getClassAssignments(row)}
          fallbackSubject={row.subject}
          fallbackFaculty={row.assignedFaculty}
          currentUser={null}
          student={row}
          marks={marks}
        />
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      sortable: false,
      render: (_, row) => (
        <div className="space-y-1 min-w-0">
          {hasValue(row.phone) ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {row.phone}
            </p>
          ) : <Missing />}
          {hasValue(row.email) && (
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-500 break-all">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'progress',
      label: 'Status',
      sortable: false,
      render: (_, row) => {
        const percent = profileCompletion(row);
        const result = getSubjectResultSummary(row);
        return (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {result.total > 0 ? (
                <>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {result.pass} Pass
                  </span>
                  <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                    {result.fail} Fail
                  </span>
                  {result.pending > 0 && (
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      {result.pending} Pending
                    </span>
                  )}
                </>
              ) : (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                  No marks
                </span>
              )}
              <button
                onClick={() => togglePublish(row)}
                disabled={publishingId === row._id}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  row.isPublished ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {row.isPublished ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {row.isPublished ? 'Published' : 'Draft'}
              </button>
            </div>
            <div className="mt-2 max-w-[170px]">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                <span className={percent === 100 ? 'text-emerald-700' : 'text-amber-700'}>{percent}%</span>
                <span className="text-slate-400">{percent === 100 ? 'Complete' : 'Needs details'}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to="#"
            onClick={(event) => {
              event.preventDefault();
              setSelectedStudent(row);
            }}
            className="p-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/students/${row._id}/edit`}
            className="p-2 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-2 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const columns = isAdmin ? cleanAdminColumns : [...facultyColumns, ...facultyExtraColumns];

  const filterDefs = [
    { key: 'department', label: 'Department', options: ['CS', 'IT', 'EC', 'ME', 'CE', 'EE', 'CH'].map(v => ({ label: v, value: v })) },
    { key: 'semester', label: 'Semester', options: [1,2,3,4,5,6,7,8].map(v => ({ label: `Sem ${v}`, value: String(v) })) },
    { key: 'section', label: 'Section', options: ['A', 'B', 'C'].map(v => ({ label: `Section ${v}`, value: v })) },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Students</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {displayStudents.length} shown from {students.length} total students
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/students/add"
            id="add-student-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { id: 'all', label: 'Total Students', value: students.length, icon: Users, tone: 'bg-indigo-50 text-indigo-700' },
          { id: 'complete', label: 'Complete Profiles', value: completeCount, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700' },
          {
            id: 'missing',
            label: missingCount ? 'Need Details' : 'Published Cards',
            value: missingCount || publishedCount,
            icon: missingCount ? AlertTriangle : GraduationCap,
            tone: missingCount ? 'bg-amber-50 text-amber-700' : 'bg-cyan-50 text-cyan-700',
          },
          { id: 'draft', label: 'Draft Cards', value: draftCount, icon: XCircle, tone: 'bg-slate-100 text-slate-600' },
        ].map(({ id, label, value, icon: Icon, tone }) => (
          <button
            key={label}
            type="button"
            onClick={() => setQuickFilter(id)}
            className={`text-left bg-white border rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition ${
              quickFilter === id ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'complete', label: 'Complete' },
          { id: 'missing', label: 'Need Details' },
          { id: 'published', label: 'Published' },
          { id: 'draft', label: 'Draft' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setQuickFilter(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              quickFilter === item.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search by name, roll number, email, phone, or guardian..."
        filters={filterDefs}
        filterValues={filters}
        onFilterChange={(key, val) => setFilters((p) => ({ ...p, [key]: val }))}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStudents}
              className="h-12 w-12 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="h-12 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-500 shadow-sm hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Reset
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : displayStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          No students found.
        </div>
      ) : (
        <div className="space-y-4">
          {displayStudents.map((student) => {
            const assignments = getClassAssignments(student);
            const result = getSubjectResultSummary(student);
            const percent = profileCompletion(student);

            const canPublish = result.total > 0 && result.pending === 0;

            return (
              <div key={student._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.8fr_1fr_1fr_auto] gap-4 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                      {getStudentInitials(student.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-sm text-slate-500">{student.roll_no}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Class</p>
                    <p className="mt-1 font-bold text-slate-800">{student.department || '-'}</p>
                    <p className="text-sm text-slate-400">Sem {student.semester || '-'} / Section {student.section || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact</p>
                    {hasValue(student.phone) ? (
                      <p className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {student.phone}
                      </p>
                    ) : <Missing />}
                    {hasValue(student.email) && (
                      <p className="flex items-center gap-1.5 text-sm text-slate-500 break-all">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {student.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {result.total > 0 ? (
                        <>
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{result.pass} Pass</span>
                          <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{result.fail} Fail</span>
                          {result.pending > 0 && (
                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{result.pending} Pending</span>
                          )}
                        </>
                      ) : (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">No marks</span>
                      )}
                      <button
                        onClick={() => togglePublish(student)}
                        disabled={publishingId === student._id || (!student.isPublished && !canPublish)}
                        title={!student.isPublished && !canPublish ? 'Enter all subject marks before publishing' : student.isPublished ? 'Unpublish report card' : 'Publish report card'}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          student.isPublished
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : canPublish
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {student.isPublished ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {student.isPublished ? 'Published' : canPublish ? 'Ready to Publish' : 'Marks Pending'}
                      </button>
                    </div>
                    <div className="mt-3 max-w-[240px]">
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                        <span className={percent === 100 ? 'text-emerald-700' : 'text-amber-700'}>{percent}%</span>
                        <span className="text-slate-400">{percent === 100 ? 'Complete' : 'Needs details'}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className="p-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <Link
                          to={`/students/${student._id}/edit`}
                          className="p-2 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(student)}
                          className="p-2 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Subjects & Faculty</p>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {assignments.length} subjects
                    </span>
                  </div>
                  {assignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
                      No subjects assigned yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                      {assignments.map(({ subject, faculty }) => {
                        const subjectId = subject?._id || subject;
                        const mark = getMarkForSubject(student, subjectId);
                        return (
                          <div key={subjectId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 leading-snug">{subject?.name || 'Subject pending'}</p>
                                <p className="text-xs font-semibold text-slate-400">{subject?.code || '-'}</p>
                              </div>
                              <span className={`rounded-lg px-2 py-1 text-xs font-black ${
                                mark?.grade === 'F'
                                  ? 'bg-rose-100 text-rose-700'
                                  : mark?.grade
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {mark?.grade || 'Pending'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-emerald-700">
                              Faculty: {faculty?.name || (user?.role === 'faculty' ? user.name : 'Not assigned')}
                            </p>
                            {mark && (
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Internal {mark.internal_marks} / External {mark.external_marks} / Total {mark.total}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-[1px]">
          <button
            type="button"
            className="flex-1"
            onClick={() => setSelectedStudent(null)}
            aria-label="Close student preview"
          />
          <aside className="w-full max-w-md bg-white shadow-2xl border-l border-slate-100 animate-in slide-in-from-right duration-200 overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {getStudentInitials(selectedStudent.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{selectedStudent.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{selectedStudent.roll_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-indigo-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Profile</p>
                  <p className="mt-1 text-xl font-bold text-indigo-700">{profileCompletion(selectedStudent)}%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <div className="mt-2"><Badge value={selectedStudent.status} /></div>
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <UserRound className="w-4 h-4 text-indigo-500" />
                  Student Details
                </h4>
                <div className="mt-2 rounded-xl border border-slate-100 px-4">
                  <DetailRow label="Department" value={selectedStudent.department} />
                  <DetailRow label="Semester" value={selectedStudent.semester} />
                  <DetailRow label="Section" value={selectedStudent.section} />
                  <DetailRow
                    label="Subject"
                    value={getClassAssignments(selectedStudent).map(({ subject }) => `${subject.name} (${subject.code})`).join(', ') || selectedStudent.subject?.name}
                  />
                  <DetailRow
                    label="Faculty"
                    value={[...new Set(getClassAssignments(selectedStudent).map(({ faculty }) => faculty?.name).filter(Boolean))].join(', ') || selectedStudent.assignedFaculty?.name}
                  />
                  <DetailRow label="Phone" value={selectedStudent.phone} />
                  <DetailRow label="Email" value={selectedStudent.email} />
                  <DetailRow label="Guardian" value={selectedStudent.guardian_name} />
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/students/${selectedStudent._id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Open
                </Link>
                {isAdmin && (
                  <Link
                    to={`/students/${selectedStudent._id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Student"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This will also remove all their mark entries.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default StudentList;
