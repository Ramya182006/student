import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Skeleton } from '../../components/Loader';
import userService from '../../services/userService';
import subjectService from '../../services/subjectService';

const DEPARTMENTS = ['CS', 'IT', 'EC', 'ME', 'CE', 'EE', 'CH', 'MCA', 'MBA'];
const DESIGNATIONS = [
  'Professor', 'Associate Professor', 'Assistant Professor',
  'Lecturer', 'Senior Lecturer', 'Head of Department', 'Visiting Faculty',
];
const SECTIONS = ['A', 'B', 'C'];

const inputClass = (err) =>
  `w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white ${err ? 'border-rose-400' : 'border-slate-200'}`;

const Field = ({ label, error, children, required, hint }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
      {hint && <span className="text-slate-400 font-normal ml-1 text-xs">({hint})</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-500">{error.message}</p>}
  </div>
);

const EditFaculty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [serverError, setServerError] = useState('');
  const [memberName, setMemberName] = useState('');
  const [subjects, setSubjects] = useState([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    Promise.all([userService.getUserById(id), subjectService.getSubjects()])
      .then(([data, subjectData]) => {
        setSubjects(Array.isArray(subjectData) ? subjectData : []);
        setMemberName(data.name);
        reset({
          name: data.name || '',
          email: data.email || '',
          department: data.department || '',
          designation: data.designation || '',
          phone: data.phone || '',
          handledSections: data.handledSections || [],
          handledSubjects: (data.handledSubjects || []).map((subject) => subject?._id || subject),
          password: '', // leave blank = keep existing
        });
      })
      .catch(() => setServerError('Failed to load faculty data.'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    // Only send password if it was filled in
    const payload = {
      ...data,
      handledSections: Array.isArray(data.handledSections) ? data.handledSections : [],
      handledSubjects: Array.isArray(data.handledSubjects) ? data.handledSubjects : [],
    };
    if (!payload.password) delete payload.password;

    try {
      await userService.updateUser(id, payload);
      navigate('/faculty');
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Failed to update faculty member.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/faculty" className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Faculty Member</h2>
          <p className="text-slate-500 text-sm">{memberName || 'Update faculty information'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {fetching ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <>
            {serverError && (
              <div className="mb-5 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Full Name" error={errors.name} required>
                  <input type="text" className={inputClass(errors.name)}
                    {...register('name', { required: 'Full name is required' })} />
                </Field>

                <Field label="Email Address" error={errors.email} required>
                  <input type="email" className={inputClass(errors.email)}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                    })} />
                </Field>

                <Field label="New Password" error={errors.password} hint="leave blank to keep current">
                  <input type="password" placeholder="••••••••" className={inputClass(errors.password)}
                    {...register('password', {
                      minLength: { value: 6, message: 'Minimum 6 characters' },
                    })} />
                </Field>

                <Field label="Phone Number" error={errors.phone}>
                  <input type="tel" placeholder="+91 98765 43210" className={inputClass(errors.phone)}
                    {...register('phone')} />
                </Field>

                <Field label="Department" error={errors.department}>
                  <select className={inputClass(errors.department)} {...register('department')}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>

                <Field label="Designation" error={errors.designation}>
                  <select className={inputClass(errors.designation)} {...register('designation')}>
                    <option value="">Select Designation</option>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>

                <Field label="Handled Sections" error={errors.handledSections}>
                  <select
                    multiple
                    size={3}
                    className={inputClass(errors.handledSections)}
                    {...register('handledSections')}
                  >
                    {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </Field>

                <Field label="Handled Subjects" error={errors.handledSubjects}>
                  <select
                    multiple
                    size={Math.min(5, Math.max(3, subjects.length || 3))}
                    className={inputClass(errors.handledSubjects)}
                    {...register('handledSubjects')}
                  >
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Sync notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
                ✅ Changes are saved directly to the database and take effect immediately.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link to="/faculty" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </Link>
                <button
                  id="edit-faculty-submit"
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSubmitting
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Save className="w-4 h-4" />}
                  {isSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default EditFaculty;
