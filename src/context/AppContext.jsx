import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

const TASKS_KEY = 'taskengine.tasks';
const THEME_KEY = 'taskengine.theme';

const seedTasks = [
  { id: '1', title: 'Review system architecture', status: 'Completed', priority: 'High', date: '2026-07-18' },
  { id: '2', title: 'Fix API context middleware bug', status: 'In Progress', priority: 'High', date: '2026-07-19' },
  { id: '3', title: 'Draft technical project documentation', status: 'Pending', priority: 'Medium', date: '2026-07-20' },
];

// Storage can be unavailable (private mode, blocked cookies) or hold stale
// junk, so every read falls back to the defaults rather than throwing.
function loadTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    if (!saved) return seedTasks;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedTasks;
  } catch {
    return seedTasks;
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const AppProvider = ({ children }) => {
  // Core tasks state initialization
  const [tasks, setTasks] = useState(loadTasks);

  const [theme, setTheme] = useState(loadTheme);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // Nothing useful to do if the write is rejected — keep the app running.
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Same here: a failed preference write should not break rendering.
    }
  }, [theme]);

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

  // Status was the only thing a task could change its mind about. A typo in
  // the title, a deadline that moved, a job that turned out to be urgent —
  // all of those meant deleting the task and typing it again from scratch.
  const updateTask = (id, changes) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;

        const title = (changes.title ?? task.title).trim();

        return {
          ...task,
          ...changes,
          // An empty title would leave an unidentifiable row, so the old
          // one stands rather than the task losing its name.
          title: title || task.title,
          // Clearing the date field means "no deadline", which is a real
          // answer and has to survive as null rather than an empty string.
          deadline: changes.deadline || null,
        };
      })
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return (
    <AppContext.Provider value={{ tasks, theme, toggleTheme, addTask, updateTask, updateTaskStatus, deleteTask }}>
      <div className={theme === 'dark' ? 'dark bg-slate-900 text-white min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
        {children}
      </div>
    </AppContext.Provider>
  );
};
