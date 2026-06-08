import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Hash,
  BookOpen,
  Layers,
  CheckCircle,
  XCircle,
  Phone,
  Calendar,
  MapPin,
  Users,
  BadgeInfo,
  UserCheck,
} from 'lucide-react';
import { Skeleton } from '../../components/Loader';
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

const assignedByLabel = (mark) => mark?.entered_by?.name || mark?.updated_by?.name || 'Not recorded';

const StudentDetails = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentService
      .getStudentById(id)
      .then((data) => {
        setStudent(data);
        setMarks(Array.isArray(data.marks) ? data.marks : []);
        setAssignedSubjects(Array.isArray(data.assignedSubjects) ? data.assignedSubjects : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-52" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!student) {
    return <div className="text-center py-20 text-slate-500">Student not found.</div>;
  }

  const totalScore = marks.reduce((acc, mark) => acc + (mark.total || 0), 0);
  const avgScore = marks.length ? (totalScore / marks.length).toFixed(1) : 0;
  const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'Not added';
  const markBySubject = marks.reduce((acc, mark) => {
    const subjectId = mark.subject_id?._id || mark.subject_id;
    if (subjectId) acc[subjectId] = mark;
    return acc;
  }, {});
  const subjectRows = assignedSubjects.length
    ? assignedSubjects.map((assignment) => ({
        assignment,
        mark: markBySubject[assignment.subject?._id || assignment.subject],
      }))
    : marks.map((mark) => ({ assignment: null, mark }));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/students" className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-slate-800">Student Details</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {student.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
              <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${student.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {student.isPublished ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {student.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Hash, label: student.roll_no },
                { icon: Mail, label: student.email },
                { icon: Phone, label: student.phone || 'No phone' },
                { icon: BookOpen, label: student.department },
                { icon: Layers, label: `Semester ${student.semester}` },
                { icon: BadgeInfo, label: student.section ? `Section ${student.section}` : 'No section' },
              ].map(({ icon: Icon, label }, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {subjectRows.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
            <div className="text-center p-3 bg-indigo-50 rounded-xl">
              <p className="text-2xl font-bold text-indigo-700">{subjectRows.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Subjects</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-700">{avgScore}</p>
              <p className="text-xs text-slate-500 mt-0.5">Avg Score</p>
            </div>
            <div className="text-center p-3 bg-rose-50 rounded-xl">
              <p className="text-2xl font-bold text-rose-700">{marks.filter((mark) => mark.grade === 'F').length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Failed</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Personal Details</h3>
          <div className="space-y-3 text-sm">
            {[
              { icon: Calendar, label: 'Date of Birth', value: dob },
              { icon: BadgeInfo, label: 'Gender', value: student.gender || 'Not added' },
              { icon: Calendar, label: 'Admission Year', value: student.admission_year || 'Not added' },
              { icon: MapPin, label: 'Address', value: student.address || 'Not added' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="font-medium text-slate-700">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">Guardian Details</h3>
          <div className="space-y-3 text-sm">
            {[
              { icon: Users, label: 'Guardian Name', value: student.guardian_name || 'Not added' },
              { icon: Phone, label: 'Guardian Phone', value: student.guardian_phone || 'Not added' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="font-medium text-slate-700">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Subject-wise Marks</h3>
        </div>
        {subjectRows.length === 0 ? (
          <p className="px-6 py-12 text-center text-slate-400">No class subjects assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Subject', 'Code', 'Internal', 'External', 'Total', 'Grade', 'Faculty'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {subjectRows.map(({ assignment, mark }, index) => (
                  <tr key={assignment?._id || mark?._id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700">{assignment?.subject?.name || mark?.subject_id?.name || '-'}</td>
                    <td className="px-5 py-3 text-slate-500">{assignment?.subject?.code || mark?.subject_id?.code || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{mark?.internal_marks ?? 'Pending'}</td>
                    <td className="px-5 py-3 text-slate-600">{mark?.external_marks ?? 'Pending'}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{mark?.total ?? '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${gradeColor(mark?.grade)}`}>
                        {mark?.grade || 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-400" />
                        {assignment?.faculty?.name || (mark ? assignedByLabel(mark) : 'Faculty pending')}
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

export default StudentDetails;
