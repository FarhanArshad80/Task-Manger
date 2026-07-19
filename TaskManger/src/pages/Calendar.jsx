import React, { useContext, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppContext } from '../context/AppContext';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const priorityStyle = {
  High: 'bg-rose-500/20 text-rose-400 border-rose-500',
  Medium: 'bg-amber-500/20 text-amber-400 border-amber-500',
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
};

// Pull whichever due-date field the task actually has.
function getTaskDate(task) {
  return task.deadline || task.dueDate || task.date || null;
}

// Normalize "2026-07-19" or a full ISO string to a plain YYYY-MM-DD key.
function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

const Calendar = () => {
  const { tasks = [] } = useContext(AppContext);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0-indexed

  const monthLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun

  // Group tasks by date key for this month, e.g. { "2026-07-19": [task, task] }
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      const key = toDateKey(getTaskDate(task));
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  const goToPrevMonth = () => setCursor(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCursor(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Timeline Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Calendar tracking matrix for sprints and target delivery boundaries.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 shadow-sm self-start">
          <button onClick={goToPrevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold px-3 font-mono">{monthLabel}</span>
          <button onClick={goToNextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="p-4 overflow-x-auto">
        <div className="min-w-150">
          <div className="grid grid-cols-7 text-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
            {weekDays.map((d) => (
              <span key={d} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank padding cells so day 1 lands on the correct weekday */}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square bg-slate-50/30 dark:bg-slate-800/20 rounded-lg opacity-40" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateKey = toDateKey(new Date(year, month, day));
              const dayTasks = tasksByDate[dateKey] || [];
              const isToday = toDateKey(new Date()) === dateKey;

              return (
                <div
                  key={day}
                  className={`aspect-square bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg p-2 transition-all flex flex-col justify-start gap-1 border overflow-hidden group ${
                    isToday ? 'border-indigo-500' : 'border-slate-200/40 dark:border-slate-700/30'
                  }`}
                >
                  <span className={`text-xs font-bold font-mono ${isToday ? 'text-indigo-500' : 'text-slate-400'} group-hover:text-indigo-500`}>
                    {day}
                  </span>
                  <div className="space-y-0.5 overflow-y-auto">
                    {dayTasks.slice(0, 2).map((task, idx) => (
                      <div
                        key={idx}
                        title={task.title}
                        className={`text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate font-medium ${
                          priorityStyle[task.priority] || priorityStyle.Medium
                        }`}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] text-slate-400 pl-1">+{dayTasks.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Calendar;