import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Save } from 'lucide-react';
import markService from '../../services/markService';
import studentService from '../../services/studentService';
import subjectService from '../../services/subjectService';
import useDraft from '../../hooks/useDraft';
import useAuth from '../../hooks/useAuth';

const DRAFT_KEY_PREFIX = 'mark_entry_draft';
const DEPARTMENTS = ['CS', 'CSE', 'IT', 'ECE', 'EC', 'ME', 'CE', 'EE', 'CH'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B', 'C'];

const calculateGrade = (total) => {
  if (total >= 90) return 'O';
  if (total >= 80) return 'A+';
  if (total >= 70) return 'A';
  if (total >= 60) return 'B+';
  if (total >= 50) return 'B';
  return 'F';
};

const gradeColor = (grade) => {
  const map = {
    O: 'text-indigo-600 bg-indigo-50',
    'A+': 'text-violet-600 bg-violet-50',
    A: 'text-cyan-600 bg-cyan-50',
    'B+': 'text-emerald-600 bg-emerald-50',
    B: 'text-teal-600 bg-teal-50',
    F: 'text-rose-600 bg-rose-50',
  };
  return map[grade] || 'text-slate-600 bg-slate-50';
};

const inputClass = 'w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white';

const formatDraftTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MarkEntry = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');
  const [conflict, setConflict] = useState(null);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState('');
  const [filters, setFilters] = useState({ department: '', semester: '', section: '' });
  const restoredSelectionKeyRef = useRef(null);
  const restoredDraftDataRef = useRef(null);
  const draftRestoreLockRef = useRef(false);

  const draftKey = useMemo(
    () => `${DRAFT_KEY_PREFIX}_${user?.id || user?._id || user?.email || 'anonymous'}`,
    [user?.id, user?._id, user?.email]
  );
  const { saveDraft, loadDraft, clearDraft } = useDraft(draftKey);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      student_id: '',
      subject_id: '',
      internal_marks: '',
      external_marks: '',
      version: 0,
    },
  });

  const selectedSubjectId = useWatch({ control, name: 'subject_id' });
  const selectedStudentId = useWatch({ control, name: 'student_id' });
  const internalMarks = useWatch({ control, name: 'internal_marks' });
  const externalMarks = useWatch({ control, name: 'external_marks' });

  const total = (parseFloat(internalMarks) || 0) + (parseFloat(externalMarks) || 0);
  const grade = internalMarks !== '' && externalMarks !== '' ? calculateGrade(total) : null;
  const selectedStudent = students.find((student) => student._id === selectedStudentId);

  const saveCurrentDraft = useCallback((overrides = {}, nextFilters = filters) => {
    const values = { ...getValues(), ...overrides };
    const hasDraftableChanges =
      values.student_id ||
      values.subject_id ||
      values.internal_marks !== '' ||
      values.external_marks !== '' ||
      nextFilters.department ||
      nextFilters.semester ||
      nextFilters.section;

    if (!hasDraftableChanges) return null;

    const savedAt = saveDraft({ ...values, filters: nextFilters });
    if (savedAt) setDraftSavedAt(savedAt);
    return savedAt;
  }, [filters, getValues, saveDraft]);

  const clearDraftRestoreLock = useCallback(() => {
    restoredSelectionKeyRef.current = null;
    restoredDraftDataRef.current = null;
    draftRestoreLockRef.current = false;
  }, []);

  useEffect(() => {
    Promise.all([
      studentService.getStudents({ limit: 1000 }).then((data) => Array.isArray(data) ? data : data.students || []),
      subjectService.getSubjects().then((data) => Array.isArray(data) ? data : []),
      markService.getMarkEntries().then((data) => Array.isArray(data) ? data : []),
    ])
      .then(([studentData, subjectData, markData]) => {
        setStudents(studentData);
        setSubjects(subjectData);
        setMarks(markData);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft?.data) {
      setPendingDraft(draft);
      setDraftSavedAt(draft.savedAt || '');
    }
  }, [loadDraft]);

  const subjectMatchesClass = (subject, studentOrFilters) => {
    const assignments = subject.classAssignments || [];
    if (!assignments.length) {
      const assignedFacultyId = subject.assignedFaculty?._id || subject.assignedFaculty;
      const currentUserId = user?._id || user?.id;
      return user?.role === 'faculty'
        ? currentUserId && assignedFacultyId && String(assignedFacultyId) === String(currentUserId)
        : true;
    }
    return assignments.some((assignment) =>
      assignment.department === studentOrFilters.department &&
      (assignment.semester === 'All' || Number(assignment.semester) === Number(studentOrFilters.semester)) &&
      assignment.section === studentOrFilters.section
    );
  };

  const getStudentSubjectId = (student) => student.subject?._id || student.subject || '';

  const classReady = filters.department && filters.semester && filters.section;

  const subjectOptions = useMemo(() => {
    if (!classReady) return [];
    if (user?.role === 'faculty') return subjects;
    return subjects.filter((subject) => subjectMatchesClass(subject, filters));
  }, [subjects, filters, classReady, user?.role, user?._id, user?.id]);

  const studentOptions = useMemo(() => {
    if (!classReady || !selectedSubjectId) return [];
    const selectedSubject = subjects.find((subject) => subject._id === selectedSubjectId);
    const classStudents = students.filter((student) =>
      student.department === filters.department &&
      Number(student.semester) === Number(filters.semester) &&
      student.section === filters.section &&
      (!selectedSubject || subjectMatchesClass(selectedSubject, student))
    );
    const subjectStudents = classStudents.filter((student) => String(getStudentSubjectId(student)) === String(selectedSubjectId));
    return subjectStudents.length ? subjectStudents : classStudents;
  }, [students, subjects, filters, classReady, selectedSubjectId, user?.role, user?._id, user?.id]);

  useEffect(() => {
    if (draftRestoreLockRef.current) return;
    if (selectedSubjectId && !subjectOptions.some((subject) => subject._id === selectedSubjectId)) {
      setValue('subject_id', '');
      setValue('student_id', '');
    }
  }, [selectedSubjectId, subjectOptions, setValue]);

  useEffect(() => {
    if (draftRestoreLockRef.current) return;
    if (selectedStudentId && !studentOptions.some((student) => student._id === selectedStudentId)) {
      setValue('student_id', '');
    }
  }, [selectedStudentId, studentOptions, setValue]);

  const formValues = watch();
  useEffect(() => {
    saveCurrentDraft(formValues, filters);
  }, [formValues, filters, saveCurrentDraft]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentDraft();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveCurrentDraft]);

  const getExistingMark = (studentId, subjectId) => marks.find((mark) => {
    const markStudentId = mark.student_id?._id || mark.student_id;
    const markSubjectId = mark.subject_id?._id || mark.subject_id;
    return markStudentId === studentId && markSubjectId === subjectId;
  });

  const existingMark = selectedStudentId && selectedSubjectId
    ? getExistingMark(selectedStudentId, selectedSubjectId)
    : null;

  useEffect(() => {
    if (!selectedStudentId || !selectedSubjectId) return;
    const selectedKey = `${selectedStudentId}:${selectedSubjectId}`;

    if (draftRestoreLockRef.current && restoredSelectionKeyRef.current === selectedKey && restoredDraftDataRef.current) {
      const draftData = restoredDraftDataRef.current;
      setValue('internal_marks', draftData.internal_marks ?? '', { shouldDirty: true, shouldValidate: true });
      setValue('external_marks', draftData.external_marks ?? '', { shouldDirty: true, shouldValidate: true });
      setValue('version', draftData.version ?? 0, { shouldDirty: true });
      return;
    }

    if (existingMark) {
      setValue('internal_marks', existingMark.internal_marks ?? '');
      setValue('external_marks', existingMark.external_marks ?? '');
      setValue('version', existingMark.version ?? 0);
      return;
    }

    setValue('internal_marks', '');
    setValue('external_marks', '');
    setValue('version', 0);
  }, [selectedStudentId, selectedSubjectId, existingMark?._id, existingMark?.version, setValue]);

  const onSubmit = async (data) => {
    setServerError('');
    setSuccess('');
    setConflict(null);

    try {
      const payload = {
        student_id: data.student_id,
        subject_id: data.subject_id,
        internal_marks: Number(data.internal_marks),
        external_marks: Number(data.external_marks),
      };

      if (existingMark) {
        const currentVersion = Number(data.version ?? existingMark.version ?? 0);
        const latestMarks = await markService.getMarkEntries();
        const latestMark = latestMarks.find((mark) => mark._id === existingMark._id);

        if (latestMark && Number(latestMark.version ?? 0) !== currentVersion) {
          setConflict({
            latestRecord: latestMark,
            attemptedPayload: { ...payload, version: currentVersion },
            manual: false,
          });
          setServerError('Conflict: This mark entry was modified by another user.');
          return;
        }
      }

      const savedMark = existingMark
        ? await markService.updateMarkEntry(existingMark._id, { ...payload, version: data.version })
        : await markService.createMarkEntry(payload);

      clearDraft();
      clearDraftRestoreLock();
      setDraftSavedAt('');
      setMarks((prev) => {
        if (existingMark) {
          return prev.map((mark) => mark._id === savedMark._id ? savedMark : mark);
        }
        return [savedMark, ...prev];
      });
      setValue('internal_marks', savedMark.internal_marks ?? '');
      setValue('external_marks', savedMark.external_marks ?? '');
      setValue('version', savedMark.version ?? 0);
      setSuccess(existingMark ? 'Mark entry updated successfully!' : 'Mark entry saved successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      if (err?.response?.status === 409) {
        setConflict({
          latestRecord: err.response.data.latestRecord,
          attemptedPayload: { ...payload, version: data.version },
          manual: false,
        });
        setServerError('Conflict: This mark entry was modified by another user.');
      } else if (err?.response?.status === 400 && err?.response?.data?.message?.includes('already exists')) {
        setServerError('A mark entry already exists. Select the student again to load it for editing.');
      } else {
        setServerError(err?.response?.data?.message || 'Failed to save mark entry.');
      }
    }
  };

  const clearForm = () => {
    reset({ student_id: '', subject_id: '', internal_marks: '', external_marks: '', version: 0 });
    setFilters({ department: '', semester: '', section: '' });
    setConflict(null);
    setPendingDraft(null);
    clearDraftRestoreLock();
    setDraftSavedAt('');
    clearDraft();
  };

  const restorePendingDraft = () => {
    if (!pendingDraft?.data) return;

    const draftData = pendingDraft.data;
    const nextFilters = draftData.filters || filters;
    const nextValues = {
      student_id: draftData.student_id || '',
      subject_id: draftData.subject_id || '',
      internal_marks: draftData.internal_marks ?? '',
      external_marks: draftData.external_marks ?? '',
      version: draftData.version ?? 0,
    };

    if (nextValues.student_id && nextValues.subject_id) {
      restoredSelectionKeyRef.current = `${nextValues.student_id}:${nextValues.subject_id}`;
      restoredDraftDataRef.current = nextValues;
      draftRestoreLockRef.current = true;
    }

    setFilters(nextFilters);
    reset(nextValues);
    setValue('subject_id', nextValues.subject_id, { shouldDirty: true, shouldValidate: true });
    setValue('student_id', nextValues.student_id, { shouldDirty: true, shouldValidate: true });
    setValue('internal_marks', nextValues.internal_marks, { shouldDirty: true, shouldValidate: true });
    setValue('external_marks', nextValues.external_marks, { shouldDirty: true, shouldValidate: true });
    setValue('version', nextValues.version, { shouldDirty: true });
    saveCurrentDraft(nextValues, nextFilters);
    setDraftSavedAt(pendingDraft.savedAt || '');
    setPendingDraft(null);
    setDraftRestored(true);
    setSuccess('Unsaved draft restored. Review the marks and click Save/Update.');
    setTimeout(() => {
      setDraftRestored(false);
      setSuccess('');
    }, 5000);
  };

  const discardPendingDraft = () => {
    setPendingDraft(null);
    setDraftRestored(false);
    setDraftSavedAt('');
    clearDraftRestoreLock();
    clearDraft();
    setSuccess('Draft discarded.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const applySavedMark = (savedMark) => {
    clearDraftRestoreLock();
    setMarks((prev) => {
      const exists = prev.some((mark) => mark._id === savedMark._id);
      return exists
        ? prev.map((mark) => mark._id === savedMark._id ? savedMark : mark)
        : [savedMark, ...prev];
    });
    setValue('internal_marks', savedMark.internal_marks ?? '');
    setValue('external_marks', savedMark.external_marks ?? '');
    setValue('version', savedMark.version ?? 0);
  };

  const acceptLatest = () => {
    if (!conflict?.latestRecord) return;
    applySavedMark(conflict.latestRecord);
    clearDraft();
    setDraftSavedAt('');
    setConflict(null);
    setServerError('');
    setSuccess('Latest version loaded into the form.');
  };

  const overwriteMine = async () => {
    if (!conflict?.latestRecord || !conflict?.attemptedPayload) return;
    setResolvingConflict(true);
    setServerError('');
    try {
      const savedMark = await markService.updateMarkEntry(conflict.latestRecord._id, {
        ...conflict.attemptedPayload,
        version: conflict.latestRecord.version,
        force: true,
      });
      applySavedMark(savedMark);
      clearDraft();
      setDraftSavedAt('');
      setConflict(null);
      setSuccess('Your marks overwrote the latest version.');
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Failed to overwrite latest marks.');
    } finally {
      setResolvingConflict(false);
    }
  };

  const startManualMerge = () => {
    if (!conflict?.latestRecord) return;
    setValue('version', conflict.latestRecord.version ?? 0, { shouldDirty: true });
    setConflict((prev) => prev ? { ...prev, manual: true } : prev);
    setServerError('Manual merge mode: choose latest or mine for each mark, then click Update.');
  };

  const useMergeValue = (field, value) => {
    if (!conflict?.latestRecord) return;
    setValue(field, value ?? '', { shouldDirty: true, shouldValidate: true });
    setValue('version', conflict.latestRecord.version ?? 0, { shouldDirty: true });
    setConflict((prev) => prev ? { ...prev, manual: true } : prev);
    setServerError('Manual merge mode: chosen value applied to the form. Review and click Update.');
  };

  const useBothLatestForMerge = () => {
    if (!conflict?.latestRecord) return;
    useMergeValue('internal_marks', conflict.latestRecord.internal_marks);
    useMergeValue('external_marks', conflict.latestRecord.external_marks);
  };

  const useBothMineForMerge = () => {
    if (!conflict?.attemptedPayload) return;
    useMergeValue('internal_marks', conflict.attemptedPayload.internal_marks);
    useMergeValue('external_marks', conflict.attemptedPayload.external_marks);
  };

  return (
    <div className="w-full space-y-4">

      {pendingDraft?.data && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="min-w-0">
                <h3 className="font-bold text-amber-900">Unsaved draft found. Restore draft?</h3>
                <p className="mt-1 text-sm text-amber-700">
                  {pendingDraft.data.filters?.department || 'Class'} / Semester {pendingDraft.data.filters?.semester || '-'} / Section {pendingDraft.data.filters?.section || '-'}
                  {pendingDraft.savedAt ? ` - saved ${formatDraftTime(pendingDraft.savedAt)}` : ''}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Internal: {pendingDraft.data.internal_marks || '-'} / External: {pendingDraft.data.external_marks || '-'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restorePendingDraft}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-700"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={discardPendingDraft}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {draftRestored && !pendingDraft && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            Draft restored{draftSavedAt ? ` from ${formatDraftTime(draftSavedAt)}` : ''}.
          </span>
          <button
            type="button"
            onClick={clearForm}
            className="ml-auto rounded-lg bg-white px-3 py-1 text-xs font-bold text-amber-700 shadow-sm hover:bg-amber-100"
          >
            Clear Draft
          </button>
        </div>
      )}

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-indigo-900">Local draft recovery</p>
          {draftSavedAt && (
            <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-indigo-700">
              Autosaved {formatDraftTime(draftSavedAt)}
            </span>
          )}
        </div>
        <p className="mt-1 leading-relaxed">
          Unsaved marks are stored in this browser for the current logged-in user. After refresh, the page asks whether to restore the draft.
          Drafts are cleared after Save or Clear, and cannot be restored from another browser/device, private mode,
          cleared browser storage, or if the student/subject record was changed or removed.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {serverError && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {serverError}
        </div>
      )}

      {conflict?.latestRecord && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-lg ring-4 ring-amber-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-900">Version conflict detected</h3>
              <p className="mt-0.5 text-xs text-amber-700">
                Another user saved this mark after you opened it. Choose how to resolve it.
              </p>
            </div>
            {conflict.manual && (
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-amber-700">
                Manual merge mode
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-amber-100 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Latest saved</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span>I: {conflict.latestRecord.internal_marks}</span>
                <span>E: {conflict.latestRecord.external_marks}</span>
                <span>Total: {conflict.latestRecord.total}</span>
                <span className={`rounded-lg px-2 py-0.5 text-xs ${gradeColor(conflict.latestRecord.grade)}`}>
                  {conflict.latestRecord.grade}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Version {conflict.latestRecord.version}
                {conflict.latestRecord.updated_by?.name ? ` by ${conflict.latestRecord.updated_by.name}` : ''}
              </p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your submitted marks</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span>I: {conflict.attemptedPayload.internal_marks}</span>
                <span>E: {conflict.attemptedPayload.external_marks}</span>
                <span>Total: {Number(conflict.attemptedPayload.internal_marks) + Number(conflict.attemptedPayload.external_marks)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Submitted from version {conflict.attemptedPayload.version}</p>
            </div>
          </div>

          {conflict.manual && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Manual merge selector</p>
                  <p className="mt-0.5 text-xs text-slate-500">Pick values and they will be applied to the form below.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={useBothLatestForMerge}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Use Latest Both
                  </button>
                  <button
                    type="button"
                    onClick={useBothMineForMerge}
                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    Use Mine Both
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {[
                  ['Internal', 'internal_marks'],
                  ['External', 'external_marks'],
                ].map(([label, field]) => (
                  <div key={field} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs font-bold text-slate-700">{label} Marks</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => useMergeValue(field, conflict.latestRecord[field])}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Latest: {conflict.latestRecord[field]}
                      </button>
                      <button
                        type="button"
                        onClick={() => useMergeValue(field, conflict.attemptedPayload[field])}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        Mine: {conflict.attemptedPayload[field]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={acceptLatest}
              disabled={resolvingConflict}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              Accept Latest
            </button>
            <button
              type="button"
              onClick={overwriteMine}
              disabled={resolvingConflict}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
            >
              {resolvingConflict ? 'Overwriting...' : 'Overwrite Mine'}
            </button>
            <button
              type="button"
              onClick={startManualMerge}
              disabled={resolvingConflict}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              Manual Merge
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Enter Marks</h3>
              <p className="text-xs text-slate-400 mt-0.5">Select class and subject to show students.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {classReady && (
                <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {filters.department} / Semester {filters.semester} / Section {filters.section}
                </span>
              )}
              <button
                type="button"
                onClick={clearForm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
              <select
                disabled={loadingData}
                value={filters.department}
                onChange={(event) => {
                  clearDraftRestoreLock();
                  const nextFilters = { ...filters, department: event.target.value };
                  setFilters(nextFilters);
                  setValue('subject_id', '');
                  setValue('student_id', '');
                  setValue('internal_marks', '');
                  setValue('external_marks', '');
                  setValue('version', 0);
                  saveCurrentDraft({ subject_id: '', student_id: '', internal_marks: '', external_marks: '', version: 0 }, nextFilters);
                }}
                className={inputClass}
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Semester</label>
              <select
                disabled={loadingData}
                value={filters.semester}
                onChange={(event) => {
                  clearDraftRestoreLock();
                  const nextFilters = { ...filters, semester: event.target.value };
                  setFilters(nextFilters);
                  setValue('subject_id', '');
                  setValue('student_id', '');
                  setValue('internal_marks', '');
                  setValue('external_marks', '');
                  setValue('version', 0);
                  saveCurrentDraft({ subject_id: '', student_id: '', internal_marks: '', external_marks: '', version: 0 }, nextFilters);
                }}
                className={inputClass}
              >
                <option value="">Select Semester</option>
                {SEMESTERS.map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Section</label>
              <select
                disabled={loadingData}
                value={filters.section}
                onChange={(event) => {
                  clearDraftRestoreLock();
                  const nextFilters = { ...filters, section: event.target.value };
                  setFilters(nextFilters);
                  setValue('subject_id', '');
                  setValue('student_id', '');
                  setValue('internal_marks', '');
                  setValue('external_marks', '');
                  setValue('version', 0);
                  saveCurrentDraft({ subject_id: '', student_id: '', internal_marks: '', external_marks: '', version: 0 }, nextFilters);
                }}
                className={inputClass}
              >
                <option value="">Select Section</option>
                {SECTIONS.map((section) => <option key={section} value={section}>Section {section}</option>)}
              </select>
            </div>
            <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              id="mark-subject-select"
              disabled={loadingData || !classReady}
              className={`${inputClass} ${errors.subject_id ? 'border-rose-400' : ''}`}
              {...register('subject_id', {
                required: 'Select a subject',
                onChange: (event) => {
                  clearDraftRestoreLock();
                  setValue('student_id', '');
                  setValue('internal_marks', '');
                  setValue('external_marks', '');
                  setValue('version', 0);
                  saveCurrentDraft({
                    subject_id: event.target.value,
                    student_id: '',
                    internal_marks: '',
                    external_marks: '',
                    version: 0,
                  });
                }
              })}
            >
              <option value="">-- Select Subject --</option>
              {subjectOptions.map((subject) => (
                <option key={subject._id} value={subject._id}>{subject.name} ({subject.code})</option>
              ))}
            </select>
            {classReady && subjectOptions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No subjects assigned for this class.</p>
            )}
            {errors.subject_id && <p className="mt-1 text-xs text-rose-500">{errors.subject_id.message}</p>}
            </div>
          </div>
        </div>

        <input type="hidden" {...register('student_id', { required: 'Select a student' })} />
        <input type="hidden" {...register('version')} />

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Students</h3>
                <p className="text-xs text-slate-400">
                  {selectedSubjectId ? `${studentOptions.length} students found for selected class and subject` : 'Select subject to show students'}
                </p>
              </div>
              {selectedStudent && (
                <span className="rounded-lg bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  Selected: {selectedStudent.name}
                </span>
              )}
            </div>

            {!selectedSubjectId ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">Select department, semester, section, and subject first.</p>
            ) : studentOptions.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-amber-600">No students found for this department, semester, section, and subject.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      {['Roll No', 'Student', 'Department', 'Semester', 'Section', 'Status', ''].map((heading) => (
                        <th key={heading} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {studentOptions.map((student) => {
                      const active = selectedStudentId === student._id;
                      const markForStudent = getExistingMark(student._id, selectedSubjectId);
                      return (
                        <tr key={student._id} className={`${active ? 'bg-indigo-50' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{student.roll_no}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                {(student.name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{student.name}</p>
                                <p className="text-xs text-slate-400">{student.email || 'No email'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{student.department}</td>
                          <td className="px-4 py-2.5 text-slate-600">Sem {student.semester}</td>
                          <td className="px-4 py-2.5 text-slate-600">{student.section || '-'}</td>
                          <td className="px-4 py-2.5">
                            {markForStudent ? (
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                Entered
                              </span>
                            ) : (
                              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                clearDraftRestoreLock();
                                const nextInternalMarks = markForStudent?.internal_marks ?? '';
                                const nextExternalMarks = markForStudent?.external_marks ?? '';
                                const nextVersion = markForStudent?.version ?? 0;
                                setValue('student_id', student._id, { shouldValidate: true });
                                setValue('internal_marks', nextInternalMarks);
                                setValue('external_marks', nextExternalMarks);
                                setValue('version', nextVersion);
                                saveCurrentDraft({
                                  student_id: student._id,
                                  internal_marks: nextInternalMarks,
                                  external_marks: nextExternalMarks,
                                  version: nextVersion,
                                });
                              }}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                              }`}
                            >
                              {active ? 'Selected' : markForStudent ? 'Edit Marks' : 'Enter Marks'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {errors.student_id && <p className="px-4 py-2 text-xs text-rose-500">{errors.student_id.message}</p>}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Mark Entry</h3>
                <p className="text-xs text-slate-400">
                  {selectedStudent
                    ? existingMark
                      ? `Editing existing marks for ${selectedStudent.name}`
                      : `Entering new marks for ${selectedStudent.name}`
                    : 'Choose a student from the table to enable mark entry'}
                </p>
              </div>
              {selectedStudent && (
                <span className={`rounded-lg px-3 py-1 text-xs font-bold ${existingMark ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  {existingMark ? 'Edit Mode' : selectedStudent.roll_no}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_minmax(260px,1fr)_auto] gap-3 items-end">
              <div className={`rounded-2xl border p-3 min-h-[70px] ${selectedStudent ? 'border-indigo-100 bg-indigo-50/60' : 'border-slate-100 bg-slate-50'}`}>
                {selectedStudent ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {(selectedStudent.name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{selectedStudent.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {selectedStudent.department} / Sem {selectedStudent.semester} / {selectedStudent.section || '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-700">No student selected</p>
                    <p className="text-xs text-slate-400 mt-1">Select from table</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Internal Marks <span className="text-rose-500">*</span>
                  <span className="text-slate-400 font-normal ml-1">(0-50)</span>
                </label>
                <input
                  id="internal-marks"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  placeholder="0"
                  disabled={!selectedStudent}
                  className={`${inputClass} ${errors.internal_marks ? 'border-rose-400' : ''}`}
                  {...register('internal_marks', {
                    required: 'Required',
                    min: { value: 0, message: 'Min 0' },
                    max: { value: 50, message: 'Max 50' },
                    onChange: (event) => {
                      clearDraftRestoreLock();
                      saveCurrentDraft({ internal_marks: event.target.value });
                    },
                  })}
                />
                {errors.internal_marks && <p className="mt-1 text-xs text-rose-500">{errors.internal_marks.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  External Marks <span className="text-rose-500">*</span>
                  <span className="text-slate-400 font-normal ml-1">(0-50)</span>
                </label>
                <input
                  id="external-marks"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  placeholder="0"
                  disabled={!selectedStudent}
                  className={`${inputClass} ${errors.external_marks ? 'border-rose-400' : ''}`}
                  {...register('external_marks', {
                    required: 'Required',
                    min: { value: 0, message: 'Min 0' },
                    max: { value: 50, message: 'Max 50' },
                    onChange: (event) => {
                      clearDraftRestoreLock();
                      saveCurrentDraft({ external_marks: event.target.value });
                    },
                  })}
                />
                {errors.external_marks && <p className="mt-1 text-xs text-rose-500">{errors.external_marks.message}</p>}
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[70px]">
                {grade ? (
                  <>
                    <div className="text-center flex-1">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-2xl font-bold text-slate-800">{total}</p>
                      <p className="text-xs text-slate-400">/100</p>
                    </div>
                    <div className="w-px h-12 bg-slate-200" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-slate-500">Grade</p>
                      <span className={`inline-block text-xl font-black px-3 py-1 rounded-lg mt-1 ${gradeColor(grade)}`}>
                        {grade}
                      </span>
                    </div>
                    <div className="w-px h-12 bg-slate-200" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-slate-500">Result</p>
                      <p className={`text-sm font-bold mt-1 ${grade === 'F' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {grade === 'F' ? 'Fail' : 'Pass'}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="w-full text-center text-sm text-slate-400">Enter marks to preview result</p>
                )}
              </div>

              <div className="flex flex-row lg:flex-col gap-3">
                <button
                  id="mark-entry-submit"
                  type="submit"
                  disabled={isSubmitting || loadingData || !selectedStudent}
                  className="flex min-w-[150px] items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSubmitting ? 'Saving...' : existingMark ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MarkEntry;
