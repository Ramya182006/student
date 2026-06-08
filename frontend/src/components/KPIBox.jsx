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
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-5 hover:shadow-md transition-shadow duration-200">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${gradient}`}>
      {Icon && <Icon className="w-7 h-7 text-white" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-slate-500 font-medium truncate">{title}</p>
      <p className="text-3xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
      {trend && (
        <span
          className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
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
