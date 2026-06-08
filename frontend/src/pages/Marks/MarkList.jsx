import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Plus, UserCheck, XCircle } from 'lucide-react';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import SearchFilter from '../../components/SearchFilter';
import markService from '../../services/markService';
import useAuth from '../../hooks/useAuth';

const gradeColor = (g) => {
  const map = {
    O: 'bg-indigo-100 text-indigo-700',
    'A+': 'bg-violet-100 text-violet-700',
    A: 'bg-cyan-100 text-cyan-700',
    'B+': 'bg-emerald-100 text-emerald-700',
    B: 'bg-teal-100 text-teal-700',
    F: 'bg-rose-100 text-rose-700',
  };
  return `px-2.5 py-0.5 rounded-full text-xs font-bold ${map[g] || 'bg-slate-100 text-slate-700'}`;
};

const FacultyCell = ({ user }) => {
  if (!user) {
    return <span className="text-slate-400">Not recorded</span>;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
        <UserCheck className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0">
        <p className="font-medium text-slate-700 truncate">{user.name}</p>
        <p className="text-xs text-slate-400 capitalize">{user.role || 'faculty'}</p>
      </div>
    </div>
  );
};

const PublishedCell = ({ value }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
      value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}
  >
    {value ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {value ? 'Published' : 'Draft'}
  </span>
);

const MarkRecordCard = ({ mark }) => {
  const passed = mark.grade !== 'F';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.2fr_1.4fr_0.7fr_1fr] gap-4 items-center">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {(mark.student_id?.name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{mark.student_id?.name || '-'}</p>
            <p className="text-sm text-slate-400 truncate">{mark.student_id?.roll_no || '-'}</p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Subject</p>
          <p className="mt-1 font-bold text-slate-900 truncate">{mark.subject_id?.name || '-'}</p>
          <p className="text-sm text-slate-400">{mark.subject_id?.code || '-'}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-semibold text-slate-400">Internal</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{mark.internal_marks}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-semibold text-slate-400">External</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{mark.external_marks}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3 text-center">
            <p className="text-xs font-semibold text-indigo-400">Total</p>
            <p className="mt-1 text-lg font-black text-indigo-700">{mark.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:justify-center">
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${gradeColor(mark.grade)}`}>
            {mark.grade || '-'}
          </span>
          <div>
            <p className={`text-sm font-bold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
              {passed ? 'Pass' : 'Fail'}
            </p>
            <PublishedCell value={!!mark.student_id?.isPublished} />
          </div>
        </div>

        <div className="lg:justify-self-end">
          <FacultyCell user={mark.entered_by} />
        </div>
      </div>
    </div>
  );
};

const MarkList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [marks, setMarks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const hasLinkedStudentAndSubject = (mark) =>
    mark?.student_id &&
    typeof mark.student_id === 'object' &&
    mark?.subject_id &&
    typeof mark.subject_id === 'object';

  const fetchMarks = useCallback(() => {
    setLoading(true);
    markService.getMarkEntries()
      .then((data) => {
        const arr = Array.isArray(data) ? data.filter(hasLinkedStudentAndSubject) : [];
        setMarks(arr);
        setFiltered(arr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMarks(); }, [fetchMarks]);

  useEffect(() => {
    if (!search) {
      setFiltered(marks);
      return;
    }

    const q = search.toLowerCase();
    setFiltered(marks.filter((m) =>
      m.student_id?.name?.toLowerCase().includes(q) ||
      m.student_id?.roll_no?.toLowerCase().includes(q) ||
      m.subject_id?.name?.toLowerCase().includes(q) ||
      m.subject_id?.code?.toLowerCase().includes(q) ||
      m.entered_by?.name?.toLowerCase().includes(q) ||
      m.entered_by?.email?.toLowerCase().includes(q) ||
      m.updated_by?.name?.toLowerCase().includes(q) ||
      (m.student_id?.isPublished ? 'published' : 'draft').includes(q)
    ));
  }, [search, marks]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await markService.deleteMarkEntry(deleteTarget._id);
      showToast('Mark entry deleted.');
      setMarks((prev) => prev.filter((m) => m._id !== deleteTarget._id));
    } catch {
      showToast('Failed to delete.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = [
    { key: 'student_id', label: 'Student', render: (v) => v?.name || '-' },
    { key: 'roll_no', label: 'Roll No', render: (_, row) => row.student_id?.roll_no || '-' },
    {
      key: 'published',
      label: 'Published',
      render: (_, row) => <PublishedCell value={!!row.student_id?.isPublished} />,
    },
    { key: 'subject_id', label: 'Subject', render: (v) => v?.name || '-' },
    { key: 'subject_code', label: 'Code', render: (_, row) => row.subject_id?.code || '-' },
    { key: 'internal_marks', label: 'Internal' },
    { key: 'external_marks', label: 'External' },
    { key: 'total', label: 'Total', render: (v) => <span className="font-semibold">{v ?? '-'}</span> },
    { key: 'grade', label: 'Grade', render: (v) => <span className={gradeColor(v)}>{v || '-'}</span> },
    {
      key: 'entered_by',
      label: 'Assigned By',
      render: (v) => <FacultyCell user={v} />,
    },
    {
      key: 'updated_by',
      label: 'Last Updated By',
      render: (v, row) => <FacultyCell user={v || row.entered_by} />,
    },
  ];

  const facultyColumns = [
    { key: 'student_id', label: 'Student', render: (v) => (
      <div>
        <p className="font-semibold text-slate-800">{v?.name || '-'}</p>
        <p className="text-xs text-slate-400">{v?.roll_no || '-'}</p>
      </div>
    ) },
    {
      key: 'subject_id',
      label: 'Subject',
      render: (v) => (
        <div>
          <p className="font-semibold text-slate-800">{v?.name || '-'}</p>
          <p className="text-xs text-slate-400">{v?.code || '-'}</p>
        </div>
      ),
    },
    {
      key: 'marks',
      label: 'Marks',
      sortable: false,
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">I: {row.internal_marks}</span>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">E: {row.external_marks}</span>
          <span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">Total: {row.total}</span>
        </div>
      ),
    },
    { key: 'grade', label: 'Grade', render: (v) => <span className={gradeColor(v)}>{v || '-'}</span> },
    {
      key: 'published',
      label: 'Status',
      render: (_, row) => <PublishedCell value={!!row.student_id?.isPublished} />,
    },
    {
      key: 'entered_by',
      label: 'Faculty',
      render: (v) => <FacultyCell user={v} />,
    },
  ];

  const visibleColumns = isAdmin ? columns : facultyColumns;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl">{toast}</div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mark Entries</h2>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} records with faculty tracking</p>
        </div>
        {!isAdmin && (
          <Link
            to="/marks/entry"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
        )}
      </div>

      <SearchFilter value={search} onChange={setSearch} placeholder="Search student, roll no, subject, or faculty..." />

      {isAdmin ? (
        <DataTable
          columns={visibleColumns}
          data={filtered}
          loading={loading}
          emptyMessage="No mark entries found."
          minWidth="0"
          wrapCells
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          No mark entries found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mark) => (
            <MarkRecordCard key={mark._id} mark={mark} />
          ))}
        </div>
      )}

      {!isAdmin && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          title="Delete Mark Entry"
          message="This mark entry will be permanently deleted. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
};

export default MarkList;
