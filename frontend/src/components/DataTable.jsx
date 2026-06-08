import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * DataTable – sortable, paginated table.
 * @param {Array} columns – [{ key, label, sortable?, render? }]
 * @param {Array} data – rows
 * @param {boolean} [loading]
 * @param {string} [emptyMessage]
 * @param {number} [pageSize=10]
 */
const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found.',
  pageSize = 10,
  minWidth = '600px',
  wrapCells = false,
}) => {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);

  const handleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
    setPage(1);
  };

  const sorted = React.useMemo(() => {
    if (!sort.key) return data;
    return [...data].sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      return sort.dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const SortIcon = ({ colKey }) => {
    if (sort.key !== colKey) return <ChevronsUpDown className="w-3 h-3 text-slate-400" />;
    return sort.dir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-indigo-500" />
    ) : (
      <ChevronDown className="w-3 h-3 text-indigo-500" />
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Table */}
      <div className={wrapCells ? 'overflow-hidden' : 'overflow-x-auto'}>
        <table className={`w-full text-sm ${wrapCells ? 'table-fixed' : ''}`} style={{ minWidth }}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`${wrapCells ? 'px-3 py-3' : 'px-5 py-3.5'} text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${
                    col.sortable !== false ? 'cursor-pointer hover:text-slate-700 hover:bg-slate-100' : ''
                  } transition-colors`}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className={`${wrapCells ? 'px-3 py-3' : 'px-5 py-4'}`}>
                      <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={`${wrapCells ? 'px-3' : 'px-5'} py-16 text-center text-slate-400`}>
                  <p className="text-base">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  className="hover:bg-indigo-50/40 transition-colors group"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`${wrapCells ? 'px-3 py-3 whitespace-normal break-words' : 'px-5 py-4 whitespace-nowrap'} text-slate-700`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && data.length > pageSize && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span>
            {Math.min((page - 1) * pageSize + 1, data.length)}–{Math.min(page * pageSize, data.length)} of{' '}
            {data.length} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page + i - 2;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pg === page
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
