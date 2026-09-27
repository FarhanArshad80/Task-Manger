import React, { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { pageName } from '../../config/sidebarNav';
import { countOverdue } from '../../utils/overdue';
import { todayKey } from '../../utils/streak';

const APP_NAME = 'MicroGains';

const Navbar = () => {
  const { tasks, theme, toggleTheme } = useContext(AppContext);
  const { pathname } = useLocation();
  const page = pageName(pathname);
  const overdue = countOverdue(tasks, todayKey());

  // The tab said "taskmanger" on every page. With a few tabs open that is a
  // row of identical labels, and a task board left open in the background
  // had no way to say something had slipped until it was clicked. The late
  // count leads because tabs truncate from the right.
  useEffect(() => {
    const late = overdue > 0 ? `(${overdue} late) ` : '';

    document.title = `${late}${page} · ${APP_NAME}`;
  }, [overdue, page]);

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between">
      {/* The bar used to read "Workspace / Production Development" on every
          page, which is a breadcrumb that never moves - so it said nothing.
          It now names where you are, which is what a breadcrumb is for. */}
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Workspace / <span className="text-slate-700 dark:text-slate-200">{page}</span>
      </div>
      <div className="flex items-center space-x-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          {theme === 'light' ? <Moon className="h-5 w-5 text-slate-600" /> : <Sun className="h-5 w-5 text-amber-400" />}
        </button>
        <div className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 border border-slate-400">
          FA
        </div>
      </div>
    </header>
  );
};

export default Navbar;