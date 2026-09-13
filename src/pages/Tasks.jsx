import React, { useState, useContext } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import TaskTable from '../components/data/TaskTable';
import { AppContext } from '../context/AppContext';
import { REPEAT_OPTIONS, REPEAT_NONE } from '../utils/recurrence';
import { shiftDay, todayKey } from '../utils/streak';

// Most deadlines are one of a handful of days, and a native date input makes
// every one of them a trip through a calendar popup. These are the answers
// people actually give when asked "when is it due".
//
// Computed on click rather than at render, so a form left open overnight
// does not file "Today" as yesterday.
const DEADLINE_SHORTCUTS = [
  { label: 'Today', day: () => todayKey() },
  { label: 'Tomorrow', day: () => shiftDay(todayKey(), 1) },
  {
    // The coming Friday, or a week today when it is already Friday or later.
    // "This week" means before the weekend, and on a Saturday that is next
    // week's Friday.
    label: 'Friday',
    day: () => {
      const today = todayKey();
      const [y, m, d] = today.split('-').map(Number);
      const weekday = new Date(y, m - 1, d).getDay();
      const ahead = (5 - weekday + 7) % 7;

      return shiftDay(today, ahead === 0 ? 7 : ahead);
    },
  },
  { label: 'Next week', day: () => shiftDay(todayKey(), 7) },
];

const Tasks = () => {
  const { addTask } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [tags, setTags] = useState('');
  const [repeat, setRepeat] = useState(REPEAT_NONE);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title,
      status: 'Pending',
      priority,                                      // drives Calendar colours and the urgent count
      // The local day, like every other date this app writes. toISOString()
      // reports the UTC one, so a task created at eleven at night was filed
      // as tomorrow's east of Greenwich and this morning's west of it.
      date: new Date().toLocaleDateString('en-CA'), // created date
      deadline: deadline || null,                    // due date, shown on Calendar
      tags,                                          // cleaned and capped by the context
      repeat,                                        // standing work comes back when it is ticked off
    });
    setTitle('');
    setDeadline('');
    setPriority('Medium');
    setTags('');
    setRepeat(REPEAT_NONE);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Task Engine Operations</h1>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Initialize a new objective..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Task priority"
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {['Low', 'Medium', 'High'].map((level) => (
              <option key={level} value={level} className="bg-white dark:bg-slate-800">
                {level} priority
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tags, comma separated"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            aria-label="Tags, comma separated"
            className="sm:w-52 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-label="Repeat schedule"
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-white dark:bg-slate-800">
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!title.trim()}>
            Deploy Task
          </Button>
        </form>
        {/* Below the row rather than inside it: the form already wraps on a
            narrow screen, and four more buttons in the same flex line would
            push the title field down to a sliver. */}
        <div className="flex flex-wrap items-center gap-2 mt-3" role="group" aria-label="Deadline shortcuts">
          <span className="text-xs text-slate-400">Due:</span>
          {DEADLINE_SHORTCUTS.map((shortcut) => {
            const value = shortcut.day();
            const on = deadline === value;

            return (
              <button
                key={shortcut.label}
                type="button"
                aria-pressed={on}
                onClick={() => setDeadline(on ? '' : value)}
                title={value}
                className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                  on
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-400'
                }`}
              >
                {shortcut.label}
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <TaskTable />
      </Card>
    </div>
  );
};

export default Tasks;