import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleColors = {
    admin: 'bg-violet-100 text-violet-700',
    faculty: 'bg-amber-100 text-amber-700',
    student: 'bg-emerald-100 text-emerald-700',
  };

  const roleColor = roleColors[user?.role] || 'bg-slate-100 text-slate-600';

  return (
    <header className="h-16 bg-white border-b border-slate-100 shadow-sm flex items-center px-4 md:px-6 gap-4 z-30 flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        id="navbar-menu-toggle"
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo/Brand */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xl">🎓</span>
        <div className="hidden sm:block">
          <h1 className="text-base font-bold text-slate-800 leading-none">EduPortal</h1>
          <p className="text-xs text-slate-400">Report Card System</p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Notification bell (placeholder) */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            id="navbar-profile-btn"
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name || 'User'}</p>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 capitalize ${roleColor}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <a
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <User className="w-4 h-4" />
                My Profile
              </a>
              <button
                id="navbar-logout-btn"
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
