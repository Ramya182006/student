import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Skeleton } from '../../components/Loader';
import studentService from '../../services/studentService';

const DEPARTMENTS = ['CS', 'CSE', 'IT', 'ECE', 'EC', 'ME', 'CE', 'EE', 'CH'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B', 'C'];
const GENDERS = ['Male', 'Female', 'Other'];
const CURRENT_YEAR = new Date().getFullYear();
const trackedKeys = [
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

const inputClass = (err) =>
  `w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white ${
    err ? 'border-rose-400' : 'border-slate-200 hover:border-slate-300'
  }`;

const Field = ({ label, error, children, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-500">{error.message}</p>}
  </div>
);

const getInitials = (name) =>
  (name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const EditStudent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const formValues = watch();
  const filledCount = trackedKeys.filter((key) => String(formValues?.[key] || '').trim()).length;
  const completion = Math.round((filledCount / trackedKeys.length) * 100);
  const initials = getInitials(formValues?.name);

  useEffect(() => {
    studentService
      .getStudentById(id)
      .then((data) => {
        reset({
          name: data.name || '',
          email: data.email || '',
          roll_no: data.roll_no || '',
          department: data.department || '',
          semester: data.semester || 1,
          section: data.section || '',
          admission_year: data.admission_year || CURRENT_YEAR,
          gender: data.gender || '',
          date_of_birth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : '',
          phone: data.phone || '',
          guardian_name: data.guardian_name || '',
          guardian_phone: data.guardian_phone || '',
          address: data.address || '',
          password: '',
        });
      })
      .catch(() => setServerError('Failed to load student data.'))
      .finally(() => setFetching(false));
  }, [id, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    const payload = {
      ...data,
      semester: Number(data.semester),
      admission_year: data.admission_year ? Number(data.admission_year) : null,
    };
    if (!payload.password) {
      delete payload.password;
    }

    try {
      await studentService.updateStudent(id, payload);
      navigate('/students');
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Failed to update student.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/students" className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Edit Student</h2>
          <p className="text-slate-500 text-sm">Update saved student information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {fetching ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Profile completion
                  </div>
                  <span className="text-sm font-bold text-indigo-700">{completion}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  {['name', 'roll_no', 'email', 'department', 'phone'].map((key) => (
                    <span
                      key={key}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        String(formValues?.[key] || '').trim() ? 'bg-indigo-500' : 'bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {serverError && (
                <div className="mb-5 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Academic Details</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Full Name" error={errors.name} required>
                      <input type="text" className={inputClass(errors.name)}
                        {...register('name', { required: 'Full name is required' })} />
                    </Field>
                    <Field label="Roll Number" error={errors.roll_no} required>
                      <input type="text" className={inputClass(errors.roll_no)}
                        {...register('roll_no', { required: 'Roll number is required' })} />
                    </Field>
                    <Field label="Email Address" error={errors.email} required>
                      <input type="email" className={inputClass(errors.email)}
                        {...register('email', {
                          required: 'Email is required',
                          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                        })} />
                    </Field>
                    <Field label="New Password" error={errors.password}>
                      <input
                        type="password"
                        placeholder="Leave blank to keep current password"
                        className={inputClass(errors.password)}
                        {...register('password', {
                          minLength: { value: 6, message: 'Min 6 characters' },
                        })}
                      />
                    </Field>
                    <Field label="Phone Number" error={errors.phone} required>
                      <input
                        type="tel"
                        className={inputClass(errors.phone)}
                        {...register('phone', {
                          required: 'Phone number is required',
                          pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' },
                        })}
                      />
                    </Field>
                    <Field label="Department" error={errors.department} required>
                      <select className={inputClass(errors.department)}
                        {...register('department', { required: 'Department is required' })}>
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>
                    <Field label="Semester" error={errors.semester} required>
                      <select className={inputClass(errors.semester)} {...register('semester', { required: 'Semester is required' })}>
                        {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </Field>
                    <Field label="Section" error={errors.section} required>
                      <select className={inputClass(errors.section)} {...register('section', { required: 'Section is required' })}>
                        <option value="">Select Section</option>
                        {SECTIONS.map((s) => <option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </Field>
                    <Field label="Admission Year" error={errors.admission_year} required>
                      <input
                        type="number"
                        min="2000"
                        max={CURRENT_YEAR + 1}
                        className={inputClass(errors.admission_year)}
                        {...register('admission_year', {
                          required: 'Admission year is required',
                          min: { value: 2000, message: 'Year must be 2000 or later' },
                          max: { value: CURRENT_YEAR + 1, message: 'Enter a valid admission year' },
                        })}
                      />
                    </Field>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Personal & Guardian Details</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Gender" error={errors.gender} required>
                      <select className={inputClass(errors.gender)} {...register('gender', { required: 'Gender is required' })}>
                        <option value="">Select Gender</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Date of Birth" error={errors.date_of_birth} required>
                      <input type="date" className={inputClass(errors.date_of_birth)} {...register('date_of_birth', { required: 'Date of birth is required' })} />
                    </Field>
                    <Field label="Guardian Name" error={errors.guardian_name} required>
                      <input type="text" className={inputClass(errors.guardian_name)} {...register('guardian_name', { required: 'Guardian name is required' })} />
                    </Field>
                    <Field label="Guardian Phone" error={errors.guardian_phone} required>
                      <input
                        type="tel"
                        className={inputClass(errors.guardian_phone)}
                        {...register('guardian_phone', {
                          required: 'Guardian phone is required',
                          pattern: { value: /^[0-9+\-\s()]{7,15}$/, message: 'Enter a valid phone number' },
                        })}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Address" error={errors.address} required>
                        <textarea rows="3" className={inputClass(errors.address)} {...register('address', { required: 'Address is required' })} />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Link to="/students" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                  >
                    {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {!fetching && (
          <aside className="lg:sticky lg:top-5 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Live Preview
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-sm">
                  {initials || 'S'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{formValues?.name || 'Student name'}</p>
                  <p className="text-sm text-slate-500 truncate">{formValues?.roll_no || 'Roll number'}</p>
                  <span className="inline-flex mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700">
                    {completion}% complete
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {[
                  { icon: GraduationCap, value: formValues?.department ? `${formValues.department} / Semester ${formValues.semester}` : 'Department and semester' },
                  { icon: GraduationCap, value: formValues?.section ? `Section ${formValues.section} subjects come from class assignment` : 'Section assignment' },
                  { icon: Mail, value: formValues?.email || 'Email for login' },
                  { icon: Phone, value: formValues?.phone || 'Phone number optional' },
                ].map(({ icon: Icon, value }, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-600">
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default EditStudent;
