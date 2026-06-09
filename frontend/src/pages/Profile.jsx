import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Copy,
  GraduationCap,
  Mail,
  Phone,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import userService from '../services/userService';

const roleTheme = {
  admin: {
    label: 'Admin',
    accent: 'from-slate-900 via-indigo-700 to-cyan-700',
    avatar: 'from-indigo-600 to-cyan-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    soft: 'bg-indigo-50 text-indigo-700',
  },
  faculty: {
    label: 'Faculty',
    accent: 'from-slate-900 via-cyan-700 to-emerald-600',
    avatar: 'from-cyan-600 to-emerald-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    soft: 'bg-cyan-50 text-cyan-700',
  },
  student: {
    label: 'Student',
    accent: 'from-slate-900 via-emerald-700 to-sky-600',
    avatar: 'from-emerald-600 to-sky-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    soft: 'bg-emerald-50 text-emerald-700',
  },
};

const roleActions = {
  admin: [
    { label: 'Students', to: '/students', icon: Users },
    { label: 'Faculty', to: '/faculty', icon: Shield },
    { label: 'Subjects', to: '/subjects', icon: BookOpen },
  ],
  faculty: [
    { label: 'Enter Marks', to: '/marks/entry', icon: ClipboardList },
    { label: 'My Students', to: '/students', icon: Users },
    { label: 'Reports', to: '/reports', icon: Award },
  ],
  student: [
    { label: 'Report Card', to: '/reports/my-report', icon: GraduationCap },
    { label: 'Dashboard', to: '/dashboard', icon: Sparkles },
    { label: 'Profile', to: '/profile', icon: User },
  ],
};

const initials = (name = 'U') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);
  const [copied, setCopied] = useState(false);
  const theme = roleTheme[user?.role] || roleTheme.student;

  useEffect(() => {
    if (!user?.id) return;
    userService
      .getUserById(user.id)
      .then((data) => setProfile({ ...user, ...data, id: data._id || user.id }))
      .catch(() => setProfile(user));
  }, [user]);

  const details = useMemo(() => ([
    { icon: User, label: 'Full Name', value: profile?.name },
    { icon: Mail, label: 'Email Address', value: profile?.email },
    { icon: Phone, label: 'Phone', value: profile?.phone || 'Not added' },
    { icon: Shield, label: 'Role', value: profile?.role, capitalize: true },
    { icon: BookOpen, label: 'Department', value: profile?.department || 'Not assigned' },
    { icon: Calendar, label: 'Account ID', value: profile?.id || profile?._id, mono: true },
  ]), [profile]);

  const handledSubjects = profile?.handledSubjects || [];
  const handledSections = profile?.handledSections || [];

  const copyAccountId = async () => {
    const accountId = profile?.id || profile?._id;
    if (!accountId) return;
    await navigator.clipboard.writeText(accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-150px)] w-full max-w-6xl flex-col gap-3 overflow-hidden">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-slate-900">My Profile</h2>
          <p className="text-sm text-slate-500">Account, role, and workspace details</p>
        </div>
        <button
          type="button"
          onClick={copyAccountId}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copied' : 'Copy ID'}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] gap-3">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className={`h-24 bg-gradient-to-br ${theme.accent}`} />
          <div className="px-5 pb-5">
            <div className="-mt-10 flex items-end gap-3">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatar} text-2xl font-bold text-white ring-4 ring-white shadow-xl`}>
                {initials(profile?.name)}
              </div>
              <div className="pb-2">
                <h3 className="max-w-[155px] truncate text-lg font-bold text-slate-900">{profile?.name || 'User'}</h3>
                <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${theme.badge}`}>
                  {theme.label}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniStat label="Status" value="Active" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
              <MiniStat label="Workspace" value={theme.label} icon={Sparkles} tone={theme.soft} />
            </div>

            <div className="mt-4 space-y-2">
              {(roleActions[user?.role] || []).map(({ label, to, icon: Icon }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="text-slate-300">›</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 min-h-0 grid-rows-[auto_1fr] gap-3">
          <div className="grid grid-cols-3 gap-2">
            <Highlight label="Email Verified" value="Ready" color="bg-emerald-50 text-emerald-700" />
            <Highlight label="Access Level" value={theme.label} color="bg-sky-50 text-sky-700" />
            <Highlight label="Portal Mode" value="Live" color="bg-amber-50 text-amber-700" />
          </div>

          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div className="min-h-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">Account Details</h3>
              <div className="mt-2 grid gap-2">
                {details.map((item) => <InfoRow key={item.label} {...item} />)}
              </div>
            </div>

            <div className="min-h-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">Role Summary</h3>
              <div className="mt-2 space-y-2">
                <SummaryBlock
                  title={profile?.designation || (user?.role === 'student' ? 'Learner Account' : `${theme.label} Account`)}
                  body={summaryText(user?.role)}
                  tone={theme.soft}
                />

                {user?.role === 'faculty' && (
                  <>
                    <TagGroup title="Handled Sections" items={handledSections.map((section) => `Section ${section}`)} empty="No sections assigned" />
                    <TagGroup title="Handled Subjects" items={handledSubjects.map((subject) => subject?.name || subject)} empty="No subjects assigned" />
                  </>
                )}

                {user?.role !== 'faculty' && (
                    <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Profile Note</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Keep your email and role details correct for login, reports, and dashboard access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const summaryText = (role) => {
  if (role === 'admin') return 'Manage students, faculty, subjects, imports, and report publishing from one workspace.';
  if (role === 'faculty') return 'View assigned students, enter marks, and track class performance for your handled subjects.';
  return 'View your report card, profile information, and published academic updates from the student panel.';
};

const MiniStat = ({ label, value, icon: Icon, tone }) => (
  <div className={`rounded-xl px-3 py-2.5 ${tone}`}>
    <Icon className="h-4 w-4" />
    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    <p className="text-sm font-bold">{value}</p>
  </div>
);

const Highlight = ({ label, value, color }) => (
  <div className={`rounded-2xl px-4 py-2.5 ${color}`}>
    <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    <p className="mt-1 text-lg font-bold">{value}</p>
  </div>
);

const InfoRow = ({ icon: Icon, label, value, capitalize, mono }) => (
  <div className="flex min-h-[52px] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-cyan-50/70">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className={`truncate text-sm font-bold text-slate-700 ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono text-[11px]' : ''}`}>
        {value || '-'}
      </p>
    </div>
  </div>
);

const SummaryBlock = ({ title, body, tone }) => (
  <div className={`rounded-xl p-3 ${tone}`}>
    <p className="text-sm font-bold">{title}</p>
    <p className="mt-1 text-sm font-medium opacity-80">{body}</p>
  </div>
);

const TagGroup = ({ title, items, empty }) => (
  <div>
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
    <div className="flex flex-wrap gap-2">
      {items.length ? items.slice(0, 6).map((item) => (
        <span key={item} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {item}
        </span>
      )) : (
        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{empty}</span>
      )}
    </div>
  </div>
);

export default Profile;
