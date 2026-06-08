import React from 'react';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const roleColors = {
  admin: 'bg-violet-100 text-violet-700 border-violet-200',
  faculty: 'bg-amber-100 text-amber-700 border-amber-200',
  student: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const Profile = () => {
  const { user } = useAuth();
  const roleColor = roleColors[user?.role] || 'bg-slate-100 text-slate-700';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
        <p className="text-slate-500 text-sm mt-0.5">Your account information</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800" />

        {/* Avatar */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-xl">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="mb-2">
              <h3 className="text-xl font-bold text-slate-800">{user?.name}</h3>
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border capitalize mt-1 ${roleColor}`}>
                {user?.role}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <InfoRow icon={User} label="Full Name" value={user?.name} />
            <InfoRow icon={Mail} label="Email Address" value={user?.email} />
            <InfoRow icon={Shield} label="Role" value={user?.role} capitalize />
            <InfoRow icon={Calendar} label="Account ID" value={user?.id} mono />
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, capitalize, mono }) => (
  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-indigo-600" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-sm font-semibold text-slate-700 mt-0.5 truncate ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </p>
    </div>
  </div>
);

export default Profile;
