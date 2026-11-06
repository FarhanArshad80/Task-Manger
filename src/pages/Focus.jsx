import { useContext, useEffect, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AppContext } from '../context/AppContext';
import { BREAK_MINUTES, FOCUS_MINUTES, clockText } from '../utils/focus';

// A timer for working on one task at a time, with the minutes written back
// onto the task when a session ends.
const Focus = () => {
  const { tasks, logFocus } = useContext(AppContext);
  const [taskId, setTaskId] = useState('');

  // Only work still to do, pinned rows first - a pin already says "this is
  // what I am on", which is the question this list asks.
  const openTasks = tasks
    .filter((task) => task.status !== 'Completed')
    .sort((a, b) => Number(b.pinned === true) - Number(a.pinned === true));

  // A task finished or deleted elsewhere drops out of the choice rather than
  // leaving the timer pointed at something that is no longer there.
  const current = openTasks.find((task) => task.id === taskId) || null;
  const currentId = current ? current.id : null;

  // Work and rest take turns. A break is never recorded against anything:
  // it is the part of the cycle that is not work.
  const [mode, setMode] = useState('focus');
  const fullSeconds = (mode === 'focus' ? FOCUS_MINUTES : BREAK_MINUTES) * 60;

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

    // Reaching zero is the one moment the session counts. Stopping the clock
    // first also stops this interval, so the session is recorded once.
    //
    // The next phase is set up but not started: a break that began on its
    // own would run down while somebody finished their sentence.
    const finish = () => {
      setEndsAt(null);

      if (mode === 'focus') {
        if (currentId) logFocus(currentId, FOCUS_MINUTES);
        setMode('break');
        setRemaining(BREAK_MINUTES * 60);
      } else {
        setMode('focus');
        setRemaining(FOCUS_MINUTES * 60);
      }
    };

    const tick = setInterval(() => {
      const at = Date.now();

      setNow(at);
      if (at >= endsAt) finish();
    }, 250);

    return () => clearInterval(tick);
  }, [endsAt, mode, currentId, logFocus]);

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

  // Back to a full session, nothing recorded. For a session that went wrong
  // from the start - the phone rang, the wrong task was picked.
  const reset = () => {
    setEndsAt(null);
    setRemaining(fullSeconds);
  };

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
            // Switching mid-session would file the whole session under the
            // second task, including the minutes spent on the first.
            disabled={running}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
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
          className={`text-xs font-semibold uppercase tracking-widest ${
            mode === 'focus' ? 'text-indigo-500' : 'text-emerald-500'
          }`}
        >
          {mode === 'focus' ? 'Focus' : 'Break'}
        </p>

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
            // Focus time with no task to put it on would be time thrown
            // away. A break needs no task.
            <Button onClick={start} disabled={mode === 'focus' && !current} className="flex items-center gap-2">
              <Play className="h-4 w-4" /> Start
            </Button>
          )}
          <Button
            onClick={reset}
            variant="secondary"
            disabled={!running && remaining === fullSeconds}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Focus;
