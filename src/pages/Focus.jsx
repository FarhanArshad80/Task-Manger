import { useContext, useState } from 'react';
import Card from '../components/ui/Card';
import { AppContext } from '../context/AppContext';

// A timer for working on one task at a time, with the minutes written back
// onto the task when a session ends.
const Focus = () => {
  const { tasks } = useContext(AppContext);
  const [taskId, setTaskId] = useState('');

  // Only work still to do, pinned rows first - a pin already says "this is
  // what I am on", which is the question this list asks.
  const openTasks = tasks
    .filter((task) => task.status !== 'Completed')
    .sort((a, b) => Number(b.pinned === true) - Number(a.pinned === true));

  // A task finished or deleted elsewhere drops out of the choice rather than
  // leaving the timer pointed at something that is no longer there.
  const current = openTasks.find((task) => task.id === taskId) || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Focus</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pick a task, start the timer, and the time is saved on the task when the session ends.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-6 py-10">
        <label className="w-full max-w-sm text-sm">
          <span className="block mb-1 font-medium text-slate-600 dark:text-slate-300">Working on</span>
          <select
            value={current ? current.id : ''}
            onChange={(event) => setTaskId(event.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">
              {openTasks.length ? 'Choose a task…' : 'No open tasks - add one on the Tasks page'}
            </option>
            {openTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.pinned ? '📌 ' : ''}{task.title}
              </option>
            ))}
          </select>
        </label>
      </Card>
    </div>
  );
};

export default Focus;
