import { useContext, useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AppContext } from '../context/AppContext';
import { FOCUS_MINUTES, clockText } from '../utils/focus';

// A timer for working on one task at a time, with the minutes written back
// onto the task when a session ends.
const Focus = () => {
  const { tasks } = useContext(AppContext);
  const [taskId, setTaskId] = useState('');
  // Seconds left on the clock while it is stopped.
  const [remaining, setRemaining] = useState(FOCUS_MINUTES * 60);
  // When the running session ends, as a timestamp, or null while stopped.
  // Counting down from a fixed end rather than subtracting a second per tick
  // keeps the clock right in a background tab, where browsers slow timers
  // to once a minute or less.
  const [endsAt, setEndsAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const running = endsAt !== null;

  useEffect(() => {
    if (endsAt === null) return undefined;

    const tick = setInterval(() => setNow(Date.now()), 250);

    return () => clearInterval(tick);
  }, [endsAt]);

  const left = running ? Math.max(0, (endsAt - now) / 1000) : remaining;

  const start = () => {
    const at = Date.now();

    setNow(at);
    setEndsAt(at + remaining * 1000);
  };

  const pause = () => {
    setRemaining(Math.max(0, (endsAt - Date.now()) / 1000));
    setEndsAt(null);
  };

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

        <p
          className="font-mono text-7xl font-semibold tabular-nums tracking-tight"
          role="timer"
          aria-label={`${clockText(left)} left`}
        >
          {clockText(left)}
        </p>

        <div className="flex gap-3">
          {running ? (
            <Button onClick={pause} variant="secondary" className="flex items-center gap-2">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          ) : (
            // Time with no task to put it on would be time thrown away.
            <Button onClick={start} disabled={!current} className="flex items-center gap-2">
              <Play className="h-4 w-4" /> Start
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Focus;
