import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Tasks from '../pages/Tasks';
import Calendar from '../pages/Calendar';
import Progress from '../pages/Progress';
import Analytics from '../pages/Analytics';
import About from '../pages/About';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
      {/* Last, and deliberately outside ProtectedRoute: a wrong address is
          not a page to be kept behind a sign-in, and sending it through the
          guard would answer "this does not exist" with "please log in". */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;