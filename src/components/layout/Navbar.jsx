import React, { useContext } from 'react';
import { Sun, Moon } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

const Navbar = () => {
  const { theme, toggleTheme } = useContext(AppContext);

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between">
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Workspace / Production Development
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