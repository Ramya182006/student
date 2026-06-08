import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

import StudentList from './pages/Students/StudentList';
import AddStudent from './pages/Students/AddStudent';
import EditStudent from './pages/Students/EditStudent';
import StudentDetails from './pages/Students/StudentDetails';

import SubjectList from './pages/Subjects/SubjectList';
import AddSubject from './pages/Subjects/AddSubject';
import EditSubject from './pages/Subjects/EditSubject';

import MarkEntry from './pages/Marks/MarkEntry';
import MarkList from './pages/Marks/MarkList';
import BulkImport from './pages/Marks/BulkImport';

import ReportCard from './pages/Reports/ReportCard';
import StudentReport from './pages/Reports/StudentReport';

import FacultyList from './pages/Faculty/FacultyList';
import AddFaculty from './pages/Faculty/AddFaculty';
import EditFaculty from './pages/Faculty/EditFaculty';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected – all authenticated users */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          {/* Students – Admin & Faculty */}
          <Route
            path="/students"
            element={<ProtectedRoute roles={['admin', 'faculty']}><StudentList /></ProtectedRoute>}
          />
          <Route
            path="/students/add"
            element={<ProtectedRoute roles={['admin']}><AddStudent /></ProtectedRoute>}
          />
          <Route
            path="/students/:id/edit"
            element={<ProtectedRoute roles={['admin']}><EditStudent /></ProtectedRoute>}
          />
          <Route
            path="/students/:id"
            element={<ProtectedRoute roles={['admin', 'faculty']}><StudentDetails /></ProtectedRoute>}
          />

          {/* Subjects – Admin & Faculty */}
          <Route
            path="/subjects"
            element={<ProtectedRoute roles={['admin', 'faculty']}><SubjectList /></ProtectedRoute>}
          />
          <Route
            path="/subjects/add"
            element={<ProtectedRoute roles={['admin']}><AddSubject /></ProtectedRoute>}
          />
          <Route
            path="/subjects/:id/edit"
            element={<ProtectedRoute roles={['admin']}><EditSubject /></ProtectedRoute>}
          />

          {/* Marks */}
          <Route
            path="/marks"
            element={<ProtectedRoute roles={['admin', 'faculty']}><MarkList /></ProtectedRoute>}
          />
          <Route
            path="/marks/entry"
            element={<ProtectedRoute roles={['faculty']}><MarkEntry /></ProtectedRoute>}
          />
          <Route
            path="/marks/bulk-import"
            element={<ProtectedRoute roles={['admin', 'faculty']}><BulkImport /></ProtectedRoute>}
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={<ProtectedRoute roles={['admin', 'faculty']}><ReportCard /></ProtectedRoute>}
          />
          <Route
            path="/reports/:studentId"
            element={<ProtectedRoute roles={['admin', 'faculty']}><ReportCard /></ProtectedRoute>}
          />
          <Route
            path="/reports/my-report"
            element={<ProtectedRoute roles={['student']}><StudentReport /></ProtectedRoute>}
          />

          {/* Faculty Management – Admin only */}
          <Route
            path="/faculty"
            element={<ProtectedRoute roles={['admin']}><FacultyList /></ProtectedRoute>}
          />
          <Route
            path="/faculty/add"
            element={<ProtectedRoute roles={['admin']}><AddFaculty /></ProtectedRoute>}
          />
          <Route
            path="/faculty/:id/edit"
            element={<ProtectedRoute roles={['admin']}><EditFaculty /></ProtectedRoute>}
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
