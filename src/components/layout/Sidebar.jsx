import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { sidebarLinks } from '../../config/sidebarNav';
import { AppContext } from '../../context/AppContext';
import { todayKey } from '../../utils/streak';

// Late work was only ever visible from inside the task table, as red rows
// among everything else - and only once somebody had gone there to look.
// The sidebar is on every page, so it is where a count of what has slipped
// can be seen without asking for it.
//
// Same rule as the table's Overdue filter: a deadline before today on work
// that is not finished. Completed work is not late however late it was
// finished.
function countOverdue(tasks, today) {
  return (tasks || []).filter(
    (task) => Boolean(task.deadline) && task.deadline < today && task.status !== 'Completed'
  ).length;
}

const Sidebar = () => {
  const { tasks } = useContext(AppContext);
  const overdue = countOverdue(tasks, todayKey());

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen p-4 flex flex-col justify-between md:flex">
      <div>
        <div className="flex items-center space-x-2 px-4 py-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">M</div>
          <span className="text-xl font-bold font-sans tracking-tight">MicroGains</span>
        </div>
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' 
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700/50'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
                {/* Only on the link that leads to the work, and only when
                    there is some. A zero badge would be a number to read on
                    every page for the days when nothing is wrong. */}
                {link.path === '/tasks' && overdue > 0 && (
                  <span
                    className="ml-auto rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-500"
                    title={`${overdue} overdue`}
                    aria-label={`${overdue} overdue`}
                  >
                    {overdue}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
        v1.0.0 Stable
      </div>
    </aside>
  );
};

export default Sidebar;