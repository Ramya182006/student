import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Filter, Search, X } from 'lucide-react';

const SearchFilter = ({
  value,
  onChange,
  placeholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  actions = null,
  debounce: delay = 300,
}) => {
  const [local, setLocal] = useState(value || '');

  useEffect(() => setLocal(value || ''), [value]);

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(timer);
  }, [local, delay, onChange]);

  const clear = useCallback(() => {
    setLocal('');
    onChange('');
  }, [onChange]);

  const activeFilters = filters
    .map((filter) => {
      const selected = filterValues[filter.key] || '';
      const option = filter.options.find((opt) => String(opt.value) === String(selected));
      return selected ? { ...filter, selected, text: option?.label || selected } : null;
    })
    .filter(Boolean);

  const clearAll = () => {
    clear();
    activeFilters.forEach((filter) => onFilterChange?.(filter.key, ''));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          {local && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {filters.map((filter) => (
          <div key={filter.key} className="relative">
            <select
              value={filterValues[filter.key] || ''}
              onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
              className="h-12 min-w-[136px] py-2.5 pl-3.5 pr-9 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none cursor-pointer"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        ))}

        {actions}
      </div>

      {(local || activeFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-400 font-semibold uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5" />
            Active
          </span>
          {local && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Search: {local}
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilterChange?.(filter.key, '')}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {filter.label}: {filter.text}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg px-2.5 py-1 font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
