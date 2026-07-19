import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const ProgressChart = () => {
  const { tasks } = useContext(AppContext);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const pending = total - completed - inProgress;

  const getPercent = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-medium mb-1">
        <span>Completion Breakdown</span>
        <span className="font-mono">{getPercent(completed)}% Combined</span>
      </div>
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full flex overflow-hidden">
        <div style={{ width: `${getPercent(completed)}%` }} className="bg-emerald-500 transition-all duration-500" />
        <div style={{ width: `${getPercent(inProgress)}%` }} className="bg-amber-500 transition-all duration-500" />
        <div style={{ width: `${getPercent(pending)}%` }} className="bg-rose-500 transition-all duration-500" />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span>Done ({completed})</span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-500">
          <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
          <span>Active ({inProgress})</span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-500">
          <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
          <span>Stalled ({pending})</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressChart;