import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Core tasks state initialization
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Review system architecture', status: 'Completed', priority: 'High', date: '2026-07-18' },
    { id: '2', title: 'Fix API context middleware bug', status: 'In Progress', priority: 'High', date: '2026-07-19' },
    { id: '3', title: 'Draft technical project documentation', status: 'Pending', priority: 'Medium', date: '2026-07-20' },
  ]);

  const [theme, setTheme] = useState('light');

  // Toggle app theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Task CRUD operations
  const addTask = (task) => {
    setTasks((prev) => [...prev, { ...task, id: Date.now().toString() }]);
  };

  const updateTaskStatus = (id, newStatus) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, status: newStatus } : task))
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return (
    <AppContext.Provider value={{ tasks, theme, toggleTheme, addTask, updateTaskStatus, deleteTask }}>
      <div className={theme === 'dark' ? 'dark bg-slate-900 text-white min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
        {children}
      </div>
    </AppContext.Provider>
  );
};