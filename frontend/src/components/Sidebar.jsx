import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Upload,
  FileText,
  User,
  X,
  GraduationCap,
  UserCheck,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/faculty', label: 'Faculty', icon: UserCheck },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/marks', label: 'Mark Entries', icon: ClipboardList },
  { to: '/marks/bulk-import', label: 'Bulk Import', icon: Upload },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

const facultyLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/marks/entry', label: 'Enter Marks', icon: ClipboardList },
  { to: '/marks', label: 'Mark List', icon: FileText },
  { to: '/marks/bulk-import', label: 'Bulk Import', icon: Upload },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

const studentLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports/my-report', label: 'My Report Card', icon: GraduationCap },
  { to: '/profile', label: 'Profile', icon: User },
];

const roleLinks = { admin: adminLinks, faculty: facultyLinks, student: studentLinks };

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const links = roleLinks[user?.role] || [];

  const baseLink =
    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 group';
  const active = 'bg-white text-cyan-700 shadow-sm ring-1 ring-white/70';
  const inactive = 'text-slate-200/85 hover:text-white hover:bg-white/10';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-slate-950 shadow-xl z-40 flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:h-auto lg:shadow-none`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 lg:hidden">
          <span className="font-bold text-white">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-400 via-sky-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">EduPortal</h1>
            <p className="text-[11px] text-cyan-100/70 mt-1">Report Card System</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-4 pb-2 text-[10px] font-bold text-cyan-100/60 uppercase tracking-widest">
            {user?.role === 'admin' ? 'Administration' : user?.role === 'faculty' ? 'Faculty Panel' : 'Student Panel'}
          </p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) => `${baseLink} ${isActive ? active : inactive}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-cyan-100/70 truncate capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
