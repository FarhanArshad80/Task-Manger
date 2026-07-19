import React from 'react';
import { NavLink } from 'react-router-dom';
import { sidebarLinks } from '../../config/sidebarNav';

const Sidebar = () => {
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