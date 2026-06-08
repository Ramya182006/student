import React, { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';

const statusTone = {
  created: 'bg-emerald-100 text-emerald-700',
  updated: 'bg-indigo-100 text-indigo-700',
  skipped: 'bg-amber-100 text-amber-700',
  failed: 'bg-rose-100 text-rose-700',
};

const markColumns = [
  ['row', 'Row'],
  ['roll_no', 'Roll No'],
  ['subject_code', 'Subject'],
  ['internal_marks', 'Internal'],
  ['external_marks', 'External'],
  ['status', 'Status'],
  ['message', 'Message'],
];

const accountColumns = [
  ['row', 'Row'],
  ['role', 'Role'],
  ['name', 'Name'],
  ['email', 'Email'],
  ['roll_no', 'Roll No'],
  ['status', 'Status'],
  ['message', 'Message'],
];

const CSVUploader = ({ onUpload, formatHint = 'roll_no,subject_code,internal_marks,external_marks' }) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are accepted.');
      return;
    }
    setFile(selectedFile);
    setResult(null);
    setError('');
  }, []);

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    setProgress(0);

    const interval = setInterval(() => setProgress((value) => Math.min(value + 10, 85)), 150);
    try {
      const response = await onUpload(file);
      clearInterval(interval);
      setProgress(100);
      setResult(response);
    } catch (err) {
      clearInterval(interval);
      setProgress(0);
      setError(err?.response?.data?.message || err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!result && (
        <div
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFile(event.dataTransfer.files[0]);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400'
          }`}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={(event) => handleFile(event.target.files[0])}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="pointer-events-none flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
              <Upload className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">{dragging ? 'Drop your CSV here' : 'Drag and drop your CSV file'}</p>
              <p className="mt-1 text-sm text-slate-500">or click to browse</p>
              <p className="mt-2 text-xs text-slate-400">
                Format: <code className="rounded bg-slate-200 px-1">{formatHint}</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {file && !result && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button type="button" onClick={reset} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            Import Complete
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
            {[
              ['Rows', result.totalRows ?? result.rows?.length ?? 0, 'text-slate-700', 'border-slate-100'],
              ['Created', result.created ?? 0, 'text-emerald-700', 'border-emerald-100'],
              ['Updated', result.updated ?? 0, 'text-indigo-700', 'border-indigo-100'],
              ['Skipped', result.skipped ?? 0, 'text-amber-700', 'border-amber-100'],
              ['Failed', result.failed ?? 0, 'text-rose-700', 'border-rose-100'],
            ].map(([label, value, tone, border]) => (
              <div key={label} className={`rounded-lg border ${border} bg-slate-50/60 p-3 text-center`}>
                <p className={`text-2xl font-bold ${tone}`}>{value}</p>
                <p className="text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {result.rows?.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 border-b border-slate-100 bg-slate-50">
                    <tr>
                      {(result.rows[0]?.role ? accountColumns : markColumns).map(([key, label]) => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.rows.map((row, index) => (
                      <tr key={`${row.row}-${index}`} className="hover:bg-slate-50">
                        {(result.rows[0]?.role ? accountColumns : markColumns).map(([key]) => (
                          <td key={key} className="px-3 py-2 text-slate-600">
                            {key === 'status' ? (
                              <span className={`rounded-lg px-2 py-1 text-xs font-bold capitalize ${statusTone[row.status] || statusTone.failed}`}>
                                {row.status}
                              </span>
                            ) : key === 'row' ? (
                              <span className="font-semibold">{row[key]}</span>
                            ) : (
                              row[key] || '-'
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button type="button" onClick={reset} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Upload another file
          </button>
        </div>
      )}

      {file && !result && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import CSV
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default CSVUploader;
