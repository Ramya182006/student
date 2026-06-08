import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, UserCheck, Save, Layers, Users } from 'lucide-react';
import DataTable from '../../components/DataTable';
import ConfirmModal from '../../components/ConfirmModal';
import subjectService from '../../services/subjectService';
import userService from '../../services/userService';
import useAuth from '../../hooks/useAuth';

const DEPARTMENTS = ['CS', 'IT', 'EC', 'ME', 'CE', 'EE', 'CH'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B', 'C'];

const SubjectList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [faculty, setFaculty] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    department: 'CS',
    semester: '1',
    section: 'A',
    rows: [{ subject: '', faculty: '' }],
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchSubjects = useCallback(() => {
    setLoading(true);
    subjectService.getSubjects()
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  useEffect(() => {
    if (!isAdmin) return;
    userService.getUsers({ role: 'faculty' })
      .then((data) => setFaculty(Array.isArray(data) ? data : []))
      .catch(() => setFaculty([]));
  }, [isAdmin]);

  const updateBulkRow = (index, key, value) => {
    setBulkForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)
    }));
  };

  const addBulkRow = () => {
    setBulkForm((prev) => ({ ...prev, rows: [...prev.rows, { subject: '', faculty: '' }] }));
  };

  const removeBulkRow = (index) => {
    setBulkForm((prev) => ({
      ...prev,
      rows: prev.rows.length === 1 ? prev.rows : prev.rows.filter((_, rowIndex) => rowIndex !== index)
    }));
  };

  const handleBulkAssign = async () => {
    const assignments = bulkForm.rows.filter((row) => row.subject && row.faculty);
    if (!bulkForm.department || !bulkForm.semester || !bulkForm.section || assignments.length === 0) {
      showToast('Select class, subject, and faculty before saving.');
      return;
    }

    setAssigning(true);
    try {
      await subjectService.bulkAssign({
        department: bulkForm.department,
        semester: Number(bulkForm.semester),
        section: bulkForm.section,
        assignments
      });
      showToast('Bulk assignment saved. Dashboards will reflect it now.');
      fetchSubjects();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save bulk assignment.');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await subjectService.deleteSubject(deleteTarget._id);
      showToast(`Subject "${deleteTarget.name}" deleted.`);
      setSubjects((prev) => prev.filter((s) => s._id !== deleteTarget._id));
    } catch {
      showToast('Failed to delete subject.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Subject Name' },
    {
      key: 'assignedFaculty',
      label: 'Class Assignments',
      render: (val, row) => (
        <div className="space-y-1.5">
          {(row.classAssignments || []).slice(0, 3).map((assignment) => (
            <div key={assignment._id} className="inline-flex mr-1.5 items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
              <Users className="w-3 h-3" />
              {assignment.department} Sem {assignment.semester}-{assignment.section}: {assignment.faculty?.name}
            </div>
          ))}
          {!row.classAssignments?.length && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              {val?.name || <span className="text-slate-400 italic">Unassigned</span>}
            </div>
          )}
        </div>
      ),
    },
    ...(isAdmin
      ? [{
          key: 'actions',
          label: 'Actions',
          sortable: false,
          render: (_, row) => (
            <div className="flex items-center gap-1.5">
              <Link
                to={`/subjects/${row._id}/edit`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setDeleteTarget(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Subjects</h2>
          <p className="text-slate-500 text-sm mt-0.5">{subjects.length} total subjects</p>
        </div>
        {isAdmin && (
          <Link
            to="/subjects/add"
            id="add-subject-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </Link>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                Bulk Assign Class Subjects
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">Assign subjects and faculty once for a department, semester, and class.</p>
            </div>
            <button
              type="button"
              onClick={handleBulkAssign}
              disabled={assigning}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {assigning ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Assignments
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" value={bulkForm.department} onChange={(e) => setBulkForm((p) => ({ ...p, department: e.target.value }))}>
              {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <select className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" value={bulkForm.semester} onChange={(e) => setBulkForm((p) => ({ ...p, semester: e.target.value }))}>
              {SEMESTERS.map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
            </select>
            <select className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm" value={bulkForm.section} onChange={(e) => setBulkForm((p) => ({ ...p, section: e.target.value }))}>
              {SECTIONS.map((section) => <option key={section} value={section}>Class {section}</option>)}
            </select>
          </div>

          <div className="mt-4 space-y-2">
            {bulkForm.rows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 rounded-xl bg-slate-50 p-3">
                <select className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" value={row.subject} onChange={(e) => updateBulkRow(index, 'subject', e.target.value)}>
                  <option value="">Select subject</option>
                  {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name} ({subject.code})</option>)}
                </select>
                <select className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" value={row.faculty} onChange={(e) => updateBulkRow(index, 'faculty', e.target.value)}>
                  <option value="">Select faculty</option>
                  {faculty.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => removeBulkRow(index)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addBulkRow}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Subject Row
            </button>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={subjects} loading={loading} emptyMessage="No subjects found." />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Subject"
        message={`Delete subject "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default SubjectList;
