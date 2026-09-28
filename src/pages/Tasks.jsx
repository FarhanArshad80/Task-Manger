import React, { useState, useContext, useEffect, useRef } from 'react';
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

// A task half typed into the form, kept while the tab is open.
//
// The form lives on this page, so glancing at the calendar to check a date
// before filling in the deadline threw away the title, the tags and the
// schedule already chosen - the moment you came back to finish it, it was
// gone. Session storage rather than local: a draft is a thought in progress,
// and one that reappeared in a new window days later would be a stranger.
const DRAFT_KEY = 'taskengine.draft';

const EMPTY_DRAFT = { title: '', deadline: '', priority: 'Medium', tags: '', repeat: REPEAT_NONE };

function loadDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    if (!saved || typeof saved !== 'object') return EMPTY_DRAFT;

    // Field by field, so a draft written by an older build cannot put
    // something that is not a string into a controlled input.
    return Object.fromEntries(
      Object.entries(EMPTY_DRAFT).map(([key, fallback]) => [
        key,
        typeof saved[key] === 'string' ? saved[key] : fallback,
      ])
    );
  } catch {
    return EMPTY_DRAFT;
  }
}

const Tasks = () => {
  const { tasks, addTask } = useContext(AppContext);
  const [draft] = useState(loadDraft);
  const [title, setTitle] = useState(draft.title);
  const [deadline, setDeadline] = useState(draft.deadline);
  const [priority, setPriority] = useState(draft.priority);
  const [tags, setTags] = useState(draft.tags);
  const [repeat, setRepeat] = useState(draft.repeat);
  const titleRef = useRef(null);

  // "n" starts a new task, as it does in most trackers - the table's "/"
  // already gets to search without the mouse, and adding work is the other
  // thing this page is for. Same guards as the slash: never while typing
  // into something, never with a modifier held.
  useEffect(() => {
    const focusTitle = (event) => {
      if (event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      titleRef.current?.focus();
    };

    window.addEventListener('keydown', focusTitle);
    return () => window.removeEventListener('keydown', focusTitle);
  }, []);

  useEffect(() => {
    const current = { title, deadline, priority, tags, repeat };
    const untouched = Object.keys(EMPTY_DRAFT).every((key) => current[key] === EMPTY_DRAFT[key]);

    try {
      // An empty form is not a draft. Removing the key keeps a submitted
      // task from leaving a copy of itself behind.
      if (untouched) sessionStorage.removeItem(DRAFT_KEY);
      else sessionStorage.setItem(DRAFT_KEY, JSON.stringify(current));
    } catch {
      // Storage unavailable - the form still works, it just forgets.
    }
  }, [title, deadline, priority, tags, repeat]);

  // An open task already carrying this title, if there is one. The same job
  // typed in twice - once on Monday, again on Wednesday when it came up in a
  // meeting - becomes two rows that each get half the updates. Compared
  // without case or surrounding space, since that is not what makes two
  // jobs different. Finished tasks do not count: doing the thing again is
  // exactly what a new one is for.
  const existing = title.trim()
    ? tasks.find(
        (task) =>
          task.status !== 'Completed' &&
          task.title.trim().toLowerCase() === title.trim().toLowerCase()
      )
    : null;

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
            ref={titleRef}
            placeholder="Initialize a new objective..."
            title="Press N to jump here"
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
        {/* A date picked a day too far back — the arrow key pressed once
            too often, last month's page left open in the popup — used to go
            in without a word and land on the board already overdue. Said,
            not refused: logging something that was due yesterday is a real
            thing to do. */}
        {existing && (
          <p role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            "{existing.title}" is already on the board ({(existing.status || 'Pending').toLowerCase()}).
          </p>
        )}
        {deadline && deadline < todayKey() && (
          <p role="status" className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            That date has already passed — this task will start out overdue.
          </p>
        )}
      </Card>
      <Card>
        <TaskTable />
      </Card>
    </div>
  );
};

export default Tasks;