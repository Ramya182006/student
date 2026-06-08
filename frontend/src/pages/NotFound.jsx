import React from 'react';
import { Link } from 'react-router-dom';
import { Home, GraduationCap } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="text-center max-w-md">
      <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <GraduationCap className="w-12 h-12 text-indigo-500" />
      </div>
      <h1 className="text-7xl font-black text-slate-200 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-slate-700 mb-3">Page Not Found</h2>
      <p className="text-slate-500 mb-8">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200"
      >
        <Home className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;
