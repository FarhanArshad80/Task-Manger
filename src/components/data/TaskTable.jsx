import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { collectTags, hasTag, tagsToText } from '../../utils/tags';
import { REPEAT_OPTIONS, REPEAT_NONE, normalizeRepeat, repeatLabel } from '../../utils/recurrence';
import { MAX_STEPS, normalizeSteps, stepProgress } from '../../utils/steps';
import { csvFilename, csvToTasks, downloadCsv, tasksToCsv } from '../../utils/csv';
import Badge from '../ui/Badge';
import { Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Pencil, Check, X, Download, Copy, CalendarOff, Upload, Repeat, ListChecks, Plus } from 'lucide-react';

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const ALL = 'All';

// Sorting keys. Priority and status are ranked by what they mean rather
// than alphabetically — "High, Medium, Low" is the useful order, and
// "High, Low, Medium" is the one plain text comparison would give.
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const STATUS_RANK = { 'In Progress': 0, Pending: 1, Completed: 2 };

const SORTABLE = {
  title: { label: 'Task Description', read: (t) => t.title.toLowerCase() },
  date: { label: 'Created', read: (t) => t.date || '' },
  deadline: { label: 'Due', read: (t) => t.deadline || '' },
  priority: { label: 'Priority', read: (t) => PRIORITY_RANK[t.priority] ?? PRIORITY_RANK.Medium },
  status: { label: 'Status Flag', read: (t) => STATUS_RANK[t.status] ?? 1 },
};

// Deadline bands. The table has always drawn overdue rows in red but given
// no way to ask for only those, which is the first thing anyone opening a
// task list on a Monday morning wants to know.
//
// Every comparison is between 'YYYY-MM-DD' strings, which sort correctly as
// plain text — no Date objects, and so no timezone to get wrong.
const DUE_FILTERS = {
  [ALL]: { label: 'Any due date', test: () => true },
  overdue: {
    label: 'Overdue',
    // Completed work is not overdue however late it was finished; the point
    // of this band is what still needs doing.
    test: (task, today) =>
      Boolean(task.deadline) && task.deadline < today && task.status !== 'Completed',
  },
  today: { label: 'Due today', test: (task, today) => task.deadline === today },
  week: {
    label: 'Due within 7 days',
    test: (task, today, horizon) =>
      Boolean(task.deadline) && task.deadline >= today && task.deadline <= horizon,
  },
  // Not an absence worth hiding: a task with no deadline is the one most
  // likely to have been forgotten about.
  none: { label: 'No deadline', test: (task) => !task.deadline },
};

// Everything about a task that a person might go looking for it by.
//
// Search read the title and nothing else, which meant the two fields added
// precisely so a task could be described by more than its title — its tags
// and the steps it is made of — were invisible to the one control anybody
// uses to find things. Typing "invoice" found the task called "invoice" and
// missed the one tagged #invoice with "chase the invoice" third on its
// checklist.
//
// Tags are stored without their hash but shown with one, so a search for
// "#billing" has to find them too — the filter list beside this box writes
// them that way, and a search box is not the place to make somebody
// remember which spelling is the real one.
function searchableText(task) {
  const tags = (task.tags || []).join(' ');
  const steps = (task.steps || []).map((step) => step.text).join(' ');

  return `${task.title} ${tags} ${steps}`.toLowerCase();
}

function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  date.setDate(date.getDate() + days);

  return date.toLocaleDateString('en-CA');
}

// The table's own settings, kept between visits.
//
// Every control above the rows reset on reload, and the table is rendered on
// two pages — so narrowing to "Overdue, High priority", opening a task and
// coming back put the whole board in front of you again. The filters are the
// question somebody is working through, and it is not a question that stops
// being theirs when the page remounts.
//
// Only what is visible in a control goes in here. A stored filter that had
// no switch on screen would be a table quietly hiding rows with no way to
// find out why; because each of these is drawn from the value it restores,
// the page always explains itself.
const VIEW_KEY = 'taskengine.table-view';

// Anything off disk is a stranger — an older build, a hand-edited store, a
// filter whose option has since been removed — so each field is checked
// against what the table can actually offer rather than trusted.
//
// The tag filter is the exception, and deliberately: tags come from the
// tasks, not from a fixed list, so it is let through as typed and the effect
// that already drops a filter pinned to a vanished tag handles the rest.
function loadView() {
  const blank = {
    query: '', statusFilter: ALL, priorityFilter: ALL, tagFilter: ALL,
    dueFilter: ALL, sort: { key: null, direction: 'asc' },
  };

  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY));

    if (!saved || typeof saved !== 'object') return blank;

    const sortKey = saved.sort?.key;

    return {
      query: typeof saved.query === 'string' ? saved.query.slice(0, 100) : '',
      statusFilter: STATUSES.includes(saved.statusFilter) ? saved.statusFilter : ALL,
      priorityFilter: PRIORITIES.includes(saved.priorityFilter) ? saved.priorityFilter : ALL,
      tagFilter: typeof saved.tagFilter === 'string' ? saved.tagFilter : ALL,
      dueFilter: Object.hasOwn(DUE_FILTERS, saved.dueFilter) ? saved.dueFilter : ALL,
      sort: Object.hasOwn(SORTABLE, sortKey)
        ? { key: sortKey, direction: saved.sort.direction === 'desc' ? 'desc' : 'asc' }
        : blank.sort,
    };
  } catch {
    return blank;
  }
}

const controlClass =
  'px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

const TaskTable = () => {
  const {
    tasks, updateTask, updateTaskStatus, updateTasksStatus, updateTasksPriority,
    updateTasksDeadline, duplicateTask, deleteTask, deleteTasks, importTasks,
    addStep, toggleStep, removeStep,
  } = useContext(AppContext);
  // Read once, on the first render, rather than on every one: this is where
  // the table was left, not a value that keeps arriving.
  const [view] = useState(loadView);
  const [query, setQuery] = useState(view.query);
  const [statusFilter, setStatusFilter] = useState(view.statusFilter);
  const [priorityFilter, setPriorityFilter] = useState(view.priorityFilter);
  const [tagFilter, setTagFilter] = useState(view.tagFilter);
  const [dueFilter, setDueFilter] = useState(view.dueFilter);
  const [sort, setSort] = useState(view.sort);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    title: '', deadline: '', priority: 'Medium', tags: '', repeat: REPEAT_NONE,
  });
  const [selected, setSelected] = useState(() => new Set());
  // Which rows have their checklist open, and what is being typed into it.
  // Open by row rather than one at a time: working through two related jobs
  // usually means having both lists in front of you.
  const [openSteps, setOpenSteps] = useState(() => new Set());
  const [stepDraft, setStepDraft] = useState({});
  // What the last import did. Reading a file is the one action here with no
  // visible result of its own — thirty new rows at the bottom of a filtered
  // table can look exactly like nothing happening.
  const [importNote, setImportNote] = useState('');
  const selectAllRef = useRef(null);

  // 'YYYY-MM-DD' strings compare correctly as plain text, and building the
  // key from local parts keeps "today" honest in every timezone.
  const today = new Date().toLocaleDateString('en-CA');
  const dueHorizon = useMemo(() => shiftDateKey(today, 7), [today]);
  const isOverdue = (item) => DUE_FILTERS.overdue.test(item, today);

  // Safely moved inside the component block
  const getBadgeVariant = (statusFlag) => {
    if (statusFlag === 'Completed') return 'success';
    if (statusFlag === 'In Progress') return 'warning';
    return 'danger';
  };

  const priorityStyle = {
    High: 'text-rose-500',
    Medium: 'text-amber-500',
    Low: 'text-emerald-500',
  };

  // Written back whenever any of them moves. A failed write is not worth
  // interrupting anybody over — the table still works, it just opens on
  // everything next time.
  useEffect(() => {
    try {
      localStorage.setItem(
        VIEW_KEY,
        JSON.stringify({ query, statusFilter, priorityFilter, tagFilter, dueFilter, sort })
      );
    } catch {
      // Storage unavailable (private window, blocked site data).
    }
  }, [query, statusFilter, priorityFilter, tagFilter, dueFilter, sort]);

  const availableTags = useMemo(() => collectTags(tasks), [tasks]);

  // A tag can go out of use entirely — the last task carrying it is deleted
  // or retagged — and a filter pinned to a tag nothing has leaves an empty
  // table with no visible control explaining why.
  useEffect(() => {
    if (tagFilter !== ALL && !availableTags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) {
      setTagFilter(ALL);
    }
  }, [availableTags, tagFilter]);

  // A task saved before the priority picker existed has none of its own;
  // the table already reads those as Medium, so the filter must agree.
  const visibleTasks = useMemo(() => {
    // A leading hash is how tags are written everywhere else on the page, so
    // it is dropped rather than searched for. Only the first one: "##" is
    // somebody looking for a literal string, not for a tag.
    const term = query.trim().toLowerCase().replace(/^#/, '');

    return tasks.filter((item) => {
      if (term && !searchableText(item).includes(term)) return false;
      if (statusFilter !== ALL && item.status !== statusFilter) return false;
      if (
        priorityFilter !== ALL &&
        (item.priority || 'Medium') !== priorityFilter
      ) {
        return false;
      }
      if (tagFilter !== ALL && !hasTag(item, tagFilter)) return false;
      if (!DUE_FILTERS[dueFilter].test(item, today, dueHorizon)) return false;
      return true;
    });
  }, [tasks, query, statusFilter, priorityFilter, tagFilter, dueFilter, today, dueHorizon]);

  // Sorting is applied after filtering so the order describes what is on
  // screen. Tasks with no due date sink to the bottom in either direction:
  // "no deadline" is not earlier or later than a real one, and letting an
  // empty string sort as the smallest value would file them all as the most
  // urgent work in the table.
  const sortedTasks = useMemo(() => {
    if (!sort.key) return visibleTasks;

    const { read } = SORTABLE[sort.key];
    const factor = sort.direction === 'asc' ? 1 : -1;
    const isBlank = (task) => sort.key === 'deadline' && !task.deadline;

    return [...visibleTasks].sort((a, b) => {
      if (isBlank(a) !== isBlank(b)) return isBlank(a) ? 1 : -1;

      const left = read(a);
      const right = read(b);

      if (left < right) return -1 * factor;
      if (left > right) return 1 * factor;
      return 0;
    });
  }, [visibleTasks, sort]);

  // First click sorts ascending, second flips it, third clears back to the
  // order the tasks were added in.
  const toggleSort = (key) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: 'asc' };
    });
  };

  // Selection is kept to what the filters are actually showing. Acting on
  // rows that scrolled out of the result set is the kind of surprise a bulk
  // delete cannot be talked out of afterwards, so narrowing the filter drops
  // anything it hides rather than carrying it along invisibly.
  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;

      const visible = new Set(visibleTasks.map((task) => task.id));
      const kept = [...current].filter((id) => visible.has(id));

      return kept.length === current.size ? current : new Set(kept);
    });
  }, [visibleTasks]);

  const allVisibleSelected =
    sortedTasks.length > 0 && sortedTasks.every((task) => selected.has(task.id));

  // A part-filled box is a real third state, and only the DOM property can
  // express it — there is no attribute for it in JSX.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.size > 0 && !allVisibleSelected;
    }
  }, [selected, allVisibleSelected]);

  const toggleRow = (id) => {
    setSelected((current) => {
      const next = new Set(current);

      if (!next.delete(id)) next.add(id);

      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(sortedTasks.map((t) => t.id)));
  };

  // Both bulk edits clear the selection afterwards. The rows they acted on
  // may well have just filtered themselves out from under it, and a
  // selection that survives into a set of rows nobody can see is how the
  // next bulk action hits the wrong tasks.
  const applyBulkStatus = (status) => {
    if (!status) return;

    updateTasksStatus([...selected], status);
    setSelected(new Set());
  };

  const applyBulkPriority = (priority) => {
    if (!priority) return;

    updateTasksPriority([...selected], priority);
    setSelected(new Set());
  };

  // Same clearing rule as the two above, and for the same reason: a new
  // deadline can filter the rows it was applied to straight out of the due
  // -date band being viewed.
  const applyBulkDeadline = (deadline) => {
    updateTasksDeadline([...selected], deadline);
    setSelected(new Set());
  };

  // Exports what is on screen, in the order it is on screen: the filters and
  // the sort are the question that was asked, and a file that ignored them
  // would answer a different one. Selecting rows narrows it further, since
  // that is a more specific way of saying the same thing.
  const exportCsv = () => {
    const rows = selected.size > 0
      ? sortedTasks.filter((task) => selected.has(task.id))
      : sortedTasks;

    if (rows.length === 0) return;

    downloadCsv(tasksToCsv(rows), csvFilename());
  };

  // Reads a CSV off disk and adds what it can make sense of. Anything the
  // reader could not turn into a task is reported rather than dropped in
  // silence — a file where half the lines went missing should say so.
  const importCsv = async (event) => {
    const file = event.target.files?.[0];

    // Choosing the same file twice fires no change event unless the input is
    // emptied first, and re-importing a file you have just corrected is a
    // completely normal thing to want to do.
    event.target.value = '';

    if (!file) return;

    try {
      const { tasks: incoming, skipped, missingHeader } = csvToTasks(await file.text(), today);

      if (missingHeader) {
        setImportNote('That file has no "Task" column, so there is nothing to import.');
        return;
      }

      if (incoming.length === 0) {
        setImportNote('No rows in that file could be read as tasks.');
        return;
      }

      importTasks(incoming);
      setImportNote(
        `Imported ${incoming.length} task${incoming.length === 1 ? '' : 's'}` +
          (skipped > 0 ? ` · ${skipped} row${skipped === 1 ? '' : 's'} skipped` : '')
      );
    } catch {
      setImportNote("That file couldn't be read.");
    }
  };

  const deleteSelected = () => {
    deleteTasks([...selected]);
    setSelected(new Set());
  };

  // The draft is filled from the row as it stands when editing opens, so a
  // task changed elsewhere is never edited from a stale copy.
  const startEditing = (task) => {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      deadline: task.deadline || '',
      priority: task.priority || 'Medium',
      tags: tagsToText(task.tags),
      repeat: normalizeRepeat(task.repeat),
    });
  };

  const saveEdit = () => {
    if (!draft.title.trim()) return;

    updateTask(editingId, draft);
    setEditingId(null);
  };

  // Enter commits, Escape abandons — the shortcuts anyone editing a cell
  // reaches for before they look for a button.
  const handleEditKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      setEditingId(null);
    }
  };

  const toggleSteps = (id) => {
    setOpenSteps((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const submitStep = (taskId) => (event) => {
    event.preventDefault();

    const text = (stepDraft[taskId] || '').trim();

    if (!text) return;

    addStep(taskId, text);
    // Cleared rather than left behind: the next step is almost always typed
    // straight after this one, into the same box.
    setStepDraft((current) => ({ ...current, [taskId]: '' }));
  };

  const isFiltered =
    query.trim() !== '' ||
    statusFilter !== ALL ||
    priorityFilter !== ALL ||
    tagFilter !== ALL ||
    dueFilter !== ALL;

  const clearFilters = () => {
    setQuery('');
    setStatusFilter(ALL);
    setPriorityFilter(ALL);
    setTagFilter(ALL);
    setDueFilter(ALL);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, tags and steps..."
            aria-label="Search tasks by title, tag or step"
            className="w-full bg-transparent focus:outline-none text-sm"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={controlClass}
        >
          {[ALL, ...STATUSES].map((option) => (
            <option key={option} value={option} className="bg-white dark:bg-slate-800">
              {option === ALL ? 'All statuses' : option}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label="Filter by priority"
          className={controlClass}
        >
          {[ALL, ...PRIORITIES].map((option) => (
            <option key={option} value={option} className="bg-white dark:bg-slate-800">
              {option === ALL ? 'All priorities' : `${option} priority`}
            </option>
          ))}
        </select>

        <select
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value)}
          aria-label="Filter by due date"
          className={controlClass}
        >
          {Object.entries(DUE_FILTERS).map(([value, { label }]) => (
            <option key={value} value={value} className="bg-white dark:bg-slate-800">
              {label}
            </option>
          ))}
        </select>

        {/* Only while there is something to clear. A permanent "Clear
            filters" beside a table showing everything is a button that does
            nothing, and the row is already five controls wide.

            It matters more than it did: the empty-state version below only
            appears once nothing matches, and a narrowed table that still has
            rows in it no longer clears itself when somebody walks away. */}
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Clear filters
          </button>
        )}

        {availableTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            aria-label="Filter by tag"
            className={controlClass}
          >
            {[ALL, ...availableTags].map((option) => (
              <option key={option} value={option} className="bg-white dark:bg-slate-800">
                {option === ALL ? 'All tags' : `#${option}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {importNote && (
        <p
          role="status"
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          {importNote}
          <button
            type="button"
            onClick={() => setImportNote('')}
            className="ml-2 font-semibold text-indigo-500 hover:underline"
          >
            Dismiss
          </button>
        </p>
      )}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-500/40 dark:bg-indigo-500/10">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            {selected.size} selected
          </span>

          <select
            value=""
            onChange={(e) => applyBulkStatus(e.target.value)}
            aria-label="Set status for selected tasks"
            className={`${controlClass} py-1 text-xs`}
          >
            <option value="" className="bg-white dark:bg-slate-800">
              Set status…
            </option>
            {STATUSES.map((option) => (
              <option key={option} value={option} className="bg-white dark:bg-slate-800">
                {option}
              </option>
            ))}
          </select>

          <select
            value=""
            onChange={(e) => applyBulkPriority(e.target.value)}
            aria-label="Set priority for selected tasks"
            className={`${controlClass} py-1 text-xs`}
          >
            <option value="" className="bg-white dark:bg-slate-800">
              Set priority…
            </option>
            {PRIORITIES.map((option) => (
              <option key={option} value={option} className="bg-white dark:bg-slate-800">
                {option}
              </option>
            ))}
          </select>

          {/* Left empty on purpose, like the two pickers beside it: the box
              is an instruction to give, not a value the selection holds — the
              rows underneath may well have five different dates between
              them. */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            Due
            <input
              type="date"
              value=""
              onChange={(e) => applyBulkDeadline(e.target.value)}
              aria-label="Set due date for selected tasks"
              className={`${controlClass} py-1 text-xs`}
            />
          </label>

          {/* A date box can be typed into but never emptied on command, and
              "no deadline" is a real state the table already filters for. */}
          <button
            type="button"
            onClick={() => applyBulkDeadline('')}
            title="Remove the due date from the selected tasks"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-500/10 dark:text-slate-300"
          >
            <CalendarOff className="h-3.5 w-3.5" />
            Clear due
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-500/10 dark:text-slate-300"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          <button
            type="button"
            onClick={deleteSelected}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Clear selection
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {isFiltered
              ? `Showing ${visibleTasks.length} of ${tasks.length} tasks`
              : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
          </p>

          {/* The input is hidden but still reachable by keyboard — `hidden`
              would take it out of the tab order and leave the control usable
              by mouse only. */}
          <label
            title="Add tasks from a CSV file"
            className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-500/10 focus-within:ring-2 focus-within:ring-indigo-500 dark:text-slate-400"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={importCsv}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            onClick={exportCsv}
            disabled={sortedTasks.length === 0}
            title={
              isFiltered
                ? 'Download the tasks shown here as a CSV'
                : 'Download every task as a CSV'
            }
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      )}

      <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
            <th className="p-4 w-10">
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                disabled={sortedTasks.length === 0}
                aria-label="Select all shown tasks"
                className="h-4 w-4 cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              />
            </th>
            {Object.entries(SORTABLE).map(([key, { label }]) => {
              const active = sort.key === key;
              const SortIcon = !active
                ? ArrowUpDown
                : sort.direction === 'asc'
                ? ArrowUp
                : ArrowDown;

              return (
                <th
                  key={key}
                  className="p-4"
                  aria-sort={
                    active
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className={`group flex items-center gap-1.5 uppercase tracking-wide transition-colors hover:text-indigo-500 ${
                      active ? 'text-indigo-500' : ''
                    }`}
                  >
                    {label}
                    <SortIcon
                      className={`h-3.5 w-3.5 transition-opacity ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                      }`}
                    />
                  </button>
                </th>
              );
            })}
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {sortedTasks.map((item) => {
            const steps = normalizeSteps(item.steps);
            const progress = stepProgress(steps);
            const stepsOpen = openSteps.has(item.id);

            return (
            <React.Fragment key={item.id}>
            <tr
              className={`transition-colors ${
                selected.has(item.id)
                  ? 'bg-indigo-50/70 dark:bg-indigo-500/10'
                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <td className="p-4">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleRow(item.id)}
                  aria-label={`Select "${item.title}"`}
                  className="h-4 w-4 cursor-pointer accent-indigo-500"
                />
              </td>
              <td className="p-4 font-medium max-w-xs">
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      onKeyDown={handleEditKeyDown}
                      aria-label="Task description"
                      autoFocus
                      className={`w-full ${controlClass}`}
                    />
                    <input
                      type="text"
                      value={draft.tags}
                      onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                      onKeyDown={handleEditKeyDown}
                      placeholder="Tags, comma separated"
                      aria-label="Tags, comma separated"
                      className={`w-full ${controlClass}`}
                    />
                    <select
                      value={draft.repeat}
                      onChange={(e) => setDraft({ ...draft, repeat: e.target.value })}
                      onKeyDown={handleEditKeyDown}
                      aria-label="Repeat schedule"
                      className={`w-full ${controlClass}`}
                    >
                      {REPEAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-white dark:bg-slate-800">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{item.title}</span>
                      {/* Said on the row rather than only in the editor: the
                          reason this task will be back tomorrow is not
                          something anyone should have to open it to find. */}
                      {/* How far through the job this is - which the status
                          flag cannot say, since a task is Pending whether
                          one step is left or nine. Doubles as the control
                          that opens the list. */}
                      {progress && (
                        <button
                          type="button"
                          onClick={() => toggleSteps(item.id)}
                          aria-expanded={stepsOpen}
                          title={`${progress.done} of ${progress.total} steps done`}
                          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            progress.complete
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          <ListChecks className="h-3 w-3" />
                          {progress.done}/{progress.total}
                        </button>
                      )}
                      {repeatLabel(item.repeat) && (
                        <span
                          title={`Comes back ${repeatLabel(item.repeat).toLowerCase()} once completed`}
                          className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
                        >
                          <Repeat className="h-3 w-3" />
                          {repeatLabel(item.repeat)}
                        </span>
                      )}
                    </div>
                    {item.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setTagFilter(tag)}
                            title={`Show only #${tag}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-600 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td className="p-4 font-mono text-slate-500">{item.date}</td>
              <td className="p-4 font-mono">
                {editingId === item.id ? (
                  <input
                    type="date"
                    value={draft.deadline}
                    onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
                    onKeyDown={handleEditKeyDown}
                    aria-label="Due date"
                    className={controlClass}
                  />
                ) : item.deadline ? (
                  <span
                    className={
                      isOverdue(item)
                        ? 'text-rose-500 font-semibold'
                        : 'text-slate-500'
                    }
                    title={isOverdue(item) ? 'Past its due date' : undefined}
                  >
                    {item.deadline}
                    {isOverdue(item) && ' · overdue'}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="p-4">
                {editingId === item.id ? (
                  <select
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                    onKeyDown={handleEditKeyDown}
                    aria-label="Priority"
                    className={controlClass}
                  >
                    {PRIORITIES.map((level) => (
                      <option key={level} value={level} className="bg-white dark:bg-slate-800">
                        {level}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`font-semibold ${
                      priorityStyle[item.priority] || priorityStyle.Medium
                    }`}
                  >
                    {item.priority || 'Medium'}
                  </span>
                )}
              </td>
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <select
                    value={item.status}
                    onChange={(e) => updateTaskStatus(item.id, e.target.value)}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium px-2 py-1 rounded-md focus:outline-none border border-slate-200 dark:border-slate-600 cursor-pointer text-xs"
                  >
                    <option value="Pending" className="bg-white dark:bg-slate-800">Pending</option>
                    <option value="In Progress" className="bg-white dark:bg-slate-800">In Progress</option>
                    <option value="Completed" className="bg-white dark:bg-slate-800">Completed</option>
                  </select>
                  <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
                </div>
              </td>
              <td className="p-4 text-right">
                {editingId === item.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={saveEdit}
                      disabled={!draft.title.trim()}
                      aria-label="Save changes"
                      className="text-emerald-500 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors p-1 rounded"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      aria-label="Discard changes"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => startEditing(item)}
                      aria-label={`Edit "${item.title}"`}
                      className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => duplicateTask(item.id)}
                      aria-label={`Duplicate "${item.title}"`}
                      title="Duplicate — same details, fresh start"
                      className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {/* The way in for a task that has no steps yet. The
                        badge in the title opens the list once there is one
                        to open, but it cannot be the only door — a task
                        with nothing broken down would have no handle at
                        all. */}
                    <button
                      onClick={() => toggleSteps(item.id)}
                      aria-expanded={stepsOpen}
                      aria-label={`${stepsOpen ? 'Hide' : 'Show'} the steps in "${item.title}"`}
                      title={progress ? 'Steps' : 'Break this into steps'}
                      className={`transition-colors p-1 rounded ${
                        stepsOpen
                          ? 'text-indigo-500'
                          : 'text-slate-400 hover:text-indigo-500'
                      }`}
                    >
                      <ListChecks className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(item.id)}
                      aria-label={`Delete "${item.title}"`}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </td>
            </tr>

            {/* The checklist, in a row of its own under its task. Inside the
                title cell it would squeeze the list into a column sized for
                a line of text; as a row it has the width the steps need. */}
            {stepsOpen && (
              <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                <td />
                <td colSpan={6} className="px-4 pb-4">
                  <ul className="space-y-1.5">
                    {steps.map((step) => (
                      <li key={step.id} className="group/step flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={step.done}
                          onChange={() => toggleStep(item.id, step.id)}
                          id={`step-${step.id}`}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                        />
                        {/* Struck through rather than removed. A finished
                            step is part of the account of the job, and a
                            list that empties as it goes ends up saying
                            nothing was ever done. */}
                        <label
                          htmlFor={`step-${step.id}`}
                          className={`cursor-pointer text-sm ${
                            step.done
                              ? 'text-slate-400 line-through dark:text-slate-500'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {step.text}
                        </label>
                        <button
                          type="button"
                          onClick={() => removeStep(item.id, step.id)}
                          aria-label={`Remove step "${step.text}"`}
                          className="ml-auto rounded p-1 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover/step:opacity-100 focus-visible:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {steps.length < MAX_STEPS ? (
                    <form onSubmit={submitStep(item.id)} className="mt-2 flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input
                        type="text"
                        value={stepDraft[item.id] || ''}
                        onChange={(e) =>
                          setStepDraft((current) => ({ ...current, [item.id]: e.target.value }))
                        }
                        placeholder="Add a step"
                        aria-label={`Add a step to "${item.title}"`}
                        className="w-full max-w-sm bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
                      />
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      That is {MAX_STEPS} steps — past this it is two tasks.
                    </p>
                  )}
                </td>
              </tr>
            )}
            </React.Fragment>
          );
          })}
          {sortedTasks.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {tasks.length === 0
                  ? 'No tasks yet — deploy one above to get started.'
                  : 'No tasks match the current filters.'}
                {isFiltered && tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-2 font-semibold text-indigo-500 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default TaskTable;