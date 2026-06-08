import React from 'react';
import { FileUp, Users, ClipboardList } from 'lucide-react';
import CSVUploader from '../../components/CSVUploader';
import markService from '../../services/markService';
import useAuth from '../../hooks/useAuth';

const BulkImport = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const handleUpload = async (file) => {
    return isAdmin
      ? await markService.importAccountsCSV(file)
      : await markService.importCSV(file);
  };

  const sampleCsv = isAdmin
    ? [
        'role,name,email,password,department,roll_no,semester,section,admission_year,gender,date_of_birth,phone,guardian_name,guardian_phone,address,designation,handled_sections,handled_subject_codes',
        'student,Arun Kumar,arun@example.com,student123,CS,CS2023001,1,A,2026,Male,2006-05-12,9876543210,Ravi Kumar,9876543211,Chennai,,,',
        'faculty,Meena R,meena@example.com,faculty123,CS,,,,,,,,,,,Assistant Professor,A,CS301|CS302',
      ].join('\n')
    : [
        'roll_no,subject_code,internal_marks,external_marks',
        ...Array.from({ length: 50 }, (_, index) => `CS2023${String(index + 1).padStart(3, '0')},CS301,40,45`),
      ].join('\n');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {isAdmin ? 'Bulk Account Import' : 'Bulk Marks Import'}
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {isAdmin
            ? 'Create student and faculty accounts from one CSV file'
            : 'Import marks for your assigned class with row-wise feedback'}
        </p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          {isAdmin ? <Users className="w-5 h-5 text-indigo-600" /> : <ClipboardList className="w-5 h-5 text-indigo-600" />}
          <h3 className="font-semibold text-indigo-800">CSV Format Requirements</h3>
        </div>
        {isAdmin ? (
          <div className="space-y-2 text-sm text-indigo-700">
            <p>Admin import creates accounts. Use role as either student or faculty.</p>
            <div className="bg-white border border-indigo-200 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              role,name,email,password,department,roll_no,semester,section,admission_year,gender,date_of_birth,phone,guardian_name,guardian_phone,address,designation,handled_sections,handled_subject_codes
            </div>
            <ul className="list-disc list-inside space-y-1 text-indigo-600 text-xs mt-2">
              <li>Student rows require roll_no, semester, and section.</li>
              <li>Faculty rows can include handled_sections and handled_subject_codes separated by |.</li>
              <li>Existing emails or roll numbers are skipped to avoid duplicates.</li>
              <li>Every row returns created, skipped, or failed status.</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-indigo-700">
            <p>Faculty import updates marks only for existing students and subjects.</p>
            <div className="bg-white border border-indigo-200 rounded-lg p-3 font-mono text-xs">
              roll_no,subject_code,internal_marks,external_marks
            </div>
            <ul className="list-disc list-inside space-y-1 text-indigo-600 text-xs mt-2">
              <li>Minimum 50 data rows are required.</li>
              <li>roll_no and subject_code must match existing records.</li>
              <li>internal_marks and external_marks must be between 0 and 50.</li>
              <li>Same file uploaded twice skips identical rows without duplicates.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([sampleCsv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = isAdmin ? 'sample_account_import.csv' : 'sample_marks_import.csv';
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors underline"
        >
          <FileUp className="w-4 h-4" />
          Download sample CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <CSVUploader
          onUpload={handleUpload}
          formatHint={
            isAdmin
              ? 'role,name,email,password,department,...'
              : 'roll_no,subject_code,internal_marks,external_marks'
          }
        />
      </div>
    </div>
  );
};

export default BulkImport;
