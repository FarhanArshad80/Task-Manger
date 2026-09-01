import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import Badge from '../ui/Badge';
import { Trash2, Search } from 'lucide-react';

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const ALL = 'All';

const controlClass =
  'px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';

const TaskTable = () => {
  const { tasks, updateTaskStatus, deleteTask } = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);

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
      return true;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const isFiltered =
    query.trim() !== '' || statusFilter !== ALL || priorityFilter !== ALL;

  const clearFilters = () => {
    setQuery('');
    setStatusFilter(ALL);
    setPriorityFilter(ALL);
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
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {isFiltered
          ? `Showing ${visibleTasks.length} of ${tasks.length} tasks`
          : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
      </p>

      <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
            <th className="p-4">Task Description</th>
            <th className="p-4">Created</th>
            <th className="p-4">Due</th>
            <th className="p-4">Priority</th>
            <th className="p-4">Status Flag</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {visibleTasks.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="p-4 font-medium max-w-xs truncate">{item.title}</td>
              <td className="p-4 font-mono text-slate-500">{item.date}</td>
              <td className="p-4 font-mono">
                {item.deadline ? (
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
                <span
                  className={`font-semibold ${
                    priorityStyle[item.priority] || priorityStyle.Medium
                  }`}
                >
                  {item.priority || 'Medium'}
                </span>
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
                <button 
                  onClick={() => deleteTask(item.id)} 
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {visibleTasks.length === 0 && (
            <tr>
              <td colSpan={6} className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
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