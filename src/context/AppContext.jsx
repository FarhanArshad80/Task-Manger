import React, { createContext, useState, useEffect } from 'react';
import { normalizeTags } from '../utils/tags';

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

  // A delete is the one action here that cannot be talked out of afterwards,
  // and a bulk delete takes a screenful at once. What was removed is held —
  // with the row each task occupied — until the undo window closes, so the
  // list can be put back the way it was read rather than reappearing at the
  // bottom in a new order.
  //
  // Deliberately not persisted: an undo offer that outlives the tab it was
  // made in is a task quietly coming back days later.
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);

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
    setTasks((prev) => [
      ...prev,
      { ...task, tags: normalizeTags(task.tags), id: Date.now().toString() },
    ]);
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
          // Tags are only touched when the edit actually mentions them, so a
          // status change from elsewhere cannot quietly strip them.
          tags: 'tags' in changes ? normalizeTags(changes.tags) : task.tags || [],
        };
      })
    );
  };

  const deleteTask = (id) => {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return;

    setRecentlyDeleted({ entries: [{ task: tasks[index], index }] });
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Bulk edits take the whole set in one pass rather than looping the single
  // -task calls: those would queue an update per task and rewrite storage
  // that many times for what the user experienced as one action.
  const updateTasksStatus = (ids, newStatus) => {
    const target = new Set(ids);

    setTasks((prev) =>
      prev.map((task) => (target.has(task.id) ? { ...task, status: newStatus } : task))
    );
  };

  const deleteTasks = (ids) => {
    const target = new Set(ids);
    const entries = [];

    tasks.forEach((task, index) => {
      if (target.has(task.id)) entries.push({ task, index });
    });

    if (entries.length === 0) return;

    setRecentlyDeleted({ entries });
    setTasks((prev) => prev.filter((task) => !target.has(task.id)));
  };

  // Each task goes back to the index it was taken from, oldest index first,
  // so re-inserting one does not push the next one past its own slot.
  const restoreDeleted = () => {
    if (!recentlyDeleted) return;

    const { entries } = recentlyDeleted;

    setTasks((prev) => {
      const next = [...prev];

      for (const { task, index } of entries) {
        // A task re-created under the same id while the offer was open is
        // already back; putting it in twice would give the table two rows
        // that every later edit would change together.
        if (next.some((existing) => existing.id === task.id)) continue;

        next.splice(Math.min(index, next.length), 0, task);
      }

      return next;
    });

    setRecentlyDeleted(null);
  };

  const dismissDeleted = () => setRecentlyDeleted(null);

  return (
    <AppContext.Provider
      value={{
        tasks,
        theme,
        toggleTheme,
        addTask,
        updateTask,
        updateTaskStatus,
        updateTasksStatus,
        deleteTask,
        deleteTasks,
        recentlyDeleted,
        restoreDeleted,
        dismissDeleted,
      }}
    >
      <div className={theme === 'dark' ? 'dark bg-slate-900 text-white min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
        {children}
      </div>
    </AppContext.Provider>
  );
};
