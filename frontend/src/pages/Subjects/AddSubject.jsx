import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, BookPlus, AlertCircle } from 'lucide-react';
import subjectService from '../../services/subjectService';
import userService from '../../services/userService';

const inputClass = (err) =>
  `w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white ${err ? 'border-rose-400' : 'border-slate-200'}`;

const Field = ({ label, error, children, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-500">{error.message}</p>}
  </div>
);

const AddSubject = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [facultyList, setFacultyList] = useState([]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', code: '', assignedFaculty: '' },
  });

  // Load faculty users for dropdown
  useEffect(() => {
    userService.getUsers({ role: 'faculty' }).then(setFacultyList).catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    setServerError('');
    const payload = { name: data.name, code: data.code };
    if (data.assignedFaculty) payload.assignedFaculty = data.assignedFaculty;
    try {
      await subjectService.createSubject(payload);
      navigate('/subjects');
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Failed to create subject.');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/subjects" className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Add Subject</h2>
          <p className="text-slate-500 text-sm">Create a new course/subject</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {serverError && (
          <div className="mb-5 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field label="Subject Name" error={errors.name} required>
            <input
              id="subject-name"
              type="text"
              placeholder="Data Structures & Algorithms"
              className={inputClass(errors.name)}
              {...register('name', { required: 'Subject name is required' })}
            />
          </Field>
          <Field label="Subject Code" error={errors.code} required>
            <input
              id="subject-code"
              type="text"
              placeholder="CS301"
              className={inputClass(errors.code)}
              {...register('code', { required: 'Subject code is required' })}
            />
          </Field>
          <Field label="Assign Faculty (optional)" error={errors.assignedFaculty}>
            <select
              id="subject-faculty"
              className={inputClass(errors.assignedFaculty)}
              {...register('assignedFaculty')}
            >
              <option value="">-- Assign Later --</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>{f.name} ({f.email})</option>
              ))}
            </select>
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/subjects" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              Cancel
            </Link>
            <button
              id="add-subject-submit"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <BookPlus className="w-4 h-4" />}
              {isSubmitting ? 'Creating…' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubject;
