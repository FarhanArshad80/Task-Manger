import { useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AppContext } from '../context/AppContext';
import { BREAK_MINUTES, FOCUS_CHOICES, FOCUS_MINUTES, clockText, playChime } from '../utils/focus';

const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

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
  const [focusMinutes, setFocusMinutes] = useState(FOCUS_MINUTES);
  const fullSeconds = (mode === 'focus' ? focusMinutes : BREAK_MINUTES) * 60;

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
      playChime();

      if (mode === 'focus') {
        if (currentId) logFocus(currentId, focusMinutes);
        setMode('break');
        setRemaining(BREAK_MINUTES * 60);
      } else {
        setMode('focus');
        setRemaining(focusMinutes * 60);
      }
    };

    const tick = setInterval(() => {
      const at = Date.now();

      setNow(at);
      if (at >= endsAt) finish();
    }, 250);

    return () => clearInterval(tick);
  }, [endsAt, mode, focusMinutes, currentId, logFocus]);

  // The job got done in eighteen minutes, or a meeting is starting. Either
  // way the time already spent was real and is kept, unlike Reset. Under a
  // minute there is nothing worth recording.
  const stopAndSave = () => {
    const spentLeft = running ? Math.max(0, (endsAt - Date.now()) / 1000) : remaining;
    const minutes = Math.floor((fullSeconds - spentLeft) / 60);

    if (currentId && minutes >= 1) logFocus(currentId, minutes);

    setEndsAt(null);
    setRemaining(focusMinutes * 60);
  };

  // For the days when the work is going well and a break would only
  // interrupt it.
  const skipBreak = () => {
    setEndsAt(null);
    setMode('focus');
    setRemaining(focusMinutes * 60);
  };

  // The length can only change before a session starts. Changing it halfway
  // would leave no honest answer to how long the session was.
  const fresh = !running && mode === 'focus' && remaining === fullSeconds;

  const chooseLength = (minutes) => {
    setFocusMinutes(minutes);
    setRemaining(minutes * 60);
  };

  const left = running ? Math.max(0, (endsAt - now) / 1000) : remaining;

  // The tab shows the time left while a session runs, so the clock can be
  // checked from another tab without coming back to this one. The page's
  // own title is put back when the clock stops or the page is left.
  useEffect(() => {
    if (!running) return undefined;

    const before = document.title;

    return () => {
      document.title = before;
    };
  }, [running]);

  const leftText = clockText(left);

  useEffect(() => {
    if (running) document.title = `${leftText} ${mode === 'focus' ? 'focus' : 'break'} · MicroGains`;
  }, [running, leftText, mode]);

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

  // Space starts and pauses, the way it does in every media player - the
  // clock is the thing on this page, and reaching for the mouse to pause it
  // when somebody walks up to the desk is one step too many.
  //
  // The listener is added once and always calls the latest version of the
  // toggle, which changes on every tick.
  const canStart = mode === 'break' || Boolean(current);
  const toggleRef = useRef(null);

  useEffect(() => {
    toggleRef.current = running ? pause : canStart ? start : null;
  });

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey) return;

      // A focused button or field already does something with the space
      // bar - pressing it there must not also toggle the clock.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))
      ) {
        return;
      }

      if (!toggleRef.current) return;

      event.preventDefault();
      toggleRef.current();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Focus</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pick a task, start the timer, and the time is saved on the task when the session ends.
          Press Space to start or pause.
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

        <div className="flex gap-2" role="group" aria-label="Session length">
          {FOCUS_CHOICES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => chooseLength(minutes)}
              disabled={!fresh}
              aria-pressed={focusMinutes === minutes}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                focusMinutes === minutes
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>

        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            mode === 'focus' ? 'text-indigo-500' : 'text-emerald-500'
          }`}
        >
          {mode === 'focus' ? 'Focus' : 'Break'}
        </p>

        {/* The ring fills as the session goes, so how far through it is can
            be read from across the room, without doing sums on the clock. */}
        <div className="relative h-72 w-72">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-slate-700" />
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (left / fullSeconds)}
              className={`transition-[stroke-dashoffset] duration-300 ${
                mode === 'focus' ? 'stroke-indigo-500' : 'stroke-emerald-500'
              }`}
            />
          </svg>
          <p
            className="absolute inset-0 flex items-center justify-center font-mono text-6xl font-semibold tabular-nums tracking-tight"
            role="timer"
            aria-label={`${clockText(left)} left`}
          >
            {clockText(left)}
          </p>
        </div>

        <div className="flex gap-3">
          {running ? (
            <Button onClick={pause} variant="secondary" className="flex items-center gap-2">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          ) : (
            // Focus time with no task to put it on would be time thrown
            // away. A break needs no task.
            <Button onClick={start} disabled={!canStart} className="flex items-center gap-2">
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
          {mode === 'focus' && !fresh && (
            <Button
              onClick={stopAndSave}
              variant="secondary"
              disabled={fullSeconds - left < 60}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Stop &amp; save
            </Button>
          )}
          {mode === 'break' && (
            <Button onClick={skipBreak} variant="secondary" className="flex items-center gap-2">
              <SkipForward className="h-4 w-4" /> Skip break
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Focus;
