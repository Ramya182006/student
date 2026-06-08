import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Mail, Phone, BookOpen, UserCheck } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import SearchFilter from '../../components/SearchFilter';
import { Skeleton } from '../../components/Loader';
import userService from '../../services/userService';

const DEPT_COLORS = {
  CS: 'bg-indigo-100 text-indigo-700',
  CSE: 'bg-indigo-100 text-indigo-700',
  IT: 'bg-violet-100 text-violet-700',
  ECE: 'bg-cyan-100 text-cyan-700',
  EC: 'bg-cyan-100 text-cyan-700',
  ME: 'bg-amber-100 text-amber-700',
  CE: 'bg-emerald-100 text-emerald-700',
  EE: 'bg-rose-100 text-rose-700',
};
const DEPARTMENTS = ['CS', 'CSE', 'IT', 'ECE', 'EC', 'ME', 'CE', 'EE', 'CH'];

const FacultyList = () => {
  const [faculty, setFaculty] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchFaculty = useCallback(() => {
    setLoading(true);
    userService.getUsers({ role: 'faculty' })
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setFaculty(arr);
        setFiltered(arr);
      })
      .catch(() => showToast('Failed to load faculty.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(faculty.filter(f => {
      const matchesSearch = !q ||
        f.name?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.department?.toLowerCase().includes(q) ||
        f.designation?.toLowerCase().includes(q);
      const matchesDepartment = !filters.department || f.department === filters.department;
      return matchesSearch && matchesDepartment;
    }));
  }, [search, faculty, filters.department]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await userService.deleteUser(deleteTarget._id);
      showToast(`Faculty "${deleteTarget.name}" removed.`);
      setFaculty(prev => prev.filter(f => f._id !== deleteTarget._id));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Faculty Management</h2>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} faculty members</p>
        </div>
        <Link
          to="/faculty/add"
          id="add-faculty-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Faculty
        </Link>
      </div>

      {/* Search */}
      <SearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, department, or designation..."
        filters={[
          {
            key: 'department',
            label: 'Department',
            options: DEPARTMENTS.map((department) => ({ label: department, value: department })),
          },
        ]}
        filterValues={filters}
        onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      />

      {/* Faculty grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center text-slate-400">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No faculty members found</p>
          <p className="text-sm mt-1">Add your first faculty member to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <div
              key={member._id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow duration-200 flex flex-col gap-4"
            >
              {/* Avatar + name */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md shadow-indigo-200">
                  {member.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">{member.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{member.designation || 'Faculty Member'}</p>
                  {member.department && (
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${DEPT_COLORS[member.department] || 'bg-slate-100 text-slate-600'}`}>
                      {member.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              {(member.handledSections?.length > 0 || member.handledSubjects?.length > 0) && (
                <div className="space-y-2 text-xs">
                  {member.handledSections?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {member.handledSections.map((section) => (
                        <span key={section} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                          Section {section}
                        </span>
                      ))}
                    </div>
                  )}
                  {member.handledSubjects?.length > 0 && (
                    <div className="flex items-start gap-2 text-slate-500">
                      <BookOpen className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" />
                      <span className="line-clamp-2">
                        {member.handledSubjects.map((subject) => subject?.name || subject).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 mt-auto border-t border-slate-100">
                <Link
                  to={`/faculty/${member._id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button
                  onClick={() => setDeleteTarget(member)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Faculty Member"
        message={`Are you sure you want to remove "${deleteTarget?.name}"? This will unassign them from all subjects.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default FacultyList;
