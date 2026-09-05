import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import { collectTags, hasTag, tagsToText } from '../../utils/tags';
import { csvFilename, downloadCsv, tasksToCsv } from '../../utils/csv';
import Badge from '../ui/Badge';
import { Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Pencil, Check, X, Download } from 'lucide-react';

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

const controlClass =
  'px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

const TaskTable = () => {
  const {
    tasks, updateTask, updateTaskStatus, updateTasksStatus, deleteTask, deleteTasks,
  } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [tagFilter, setTagFilter] = useState(ALL);
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', deadline: '', priority: 'Medium', tags: '' });
  const [selected, setSelected] = useState(() => new Set());
  const selectAllRef = useRef(null);

  // 'YYYY-MM-DD' strings compare correctly as plain text, and building the
  // key from local parts keeps "today" honest in every timezone.
  const today = new Date().toLocaleDateString('en-CA');
  const isOverdue = (item) =>
    Boolean(item.deadline) && item.deadline < today && item.status !== 'Completed';

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
    const term = query.trim().toLowerCase();

    return tasks.filter((item) => {
      if (term && !item.title.toLowerCase().includes(term)) return false;
      if (statusFilter !== ALL && item.status !== statusFilter) return false;
      if (
        priorityFilter !== ALL &&
        (item.priority || 'Medium') !== priorityFilter
      ) {
        return false;
      }
      if (tagFilter !== ALL && !hasTag(item, tagFilter)) return false;
      return true;
    });
  }, [tasks, query, statusFilter, priorityFilter, tagFilter]);

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

  const applyBulkStatus = (status) => {
    if (!status) return;

    updateTasksStatus([...selected], status);
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

  const isFiltered =
    query.trim() !== '' ||
    statusFilter !== ALL ||
    priorityFilter !== ALL ||
    tagFilter !== ALL;

  const clearFilters = () => {
    setQuery('');
    setStatusFilter(ALL);
    setPriorityFilter(ALL);
    setTagFilter(ALL);
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
            placeholder="Filter tasks by description..."
            aria-label="Filter tasks by description"
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

          <button
            type="button"
            onClick={exportCsv}
            disabled={sortedTasks.length === 0}
            title={
              isFiltered
                ? 'Download the tasks shown here as a CSV'
                : 'Download every task as a CSV'
            }
            className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-400"
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
          {sortedTasks.map((item) => (
            <tr
              key={item.id}
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
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="block truncate">{item.title}</span>
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
          ))}
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