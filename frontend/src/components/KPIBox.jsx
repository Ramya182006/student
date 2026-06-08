import React from 'react';

/**
 * KPIBox – a stat card with gradient icon, value, label, and optional trend.
 * @param {string} title
 * @param {string|number} value
 * @param {React.ReactNode} icon – Lucide icon component
 * @param {string} gradient – Tailwind gradient classes for icon background
 * @param {string} [trend] – e.g. '+12%'
 * @param {string} [trendDir] – 'up' | 'down'
 */
const KPIBox = ({ title, value, icon: Icon, gradient, trend, trendDir }) => (
  <div className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md">
    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${gradient}`}>
      {Icon && <Icon className="h-5 w-5 text-white" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{value}</p>
      {trend && (
        <span
          className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${
            trendDir === 'up' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {trendDir === 'up' ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
  </div>
);

export default KPIBox;
