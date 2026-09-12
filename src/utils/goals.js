import { shiftDay, todayKey } from './streak';

// The three figures on the Progress page.
//
// They were bars at 85%, 70% and 95%, written into the markup beside labels
// about rollbacks and cycle speed - the same fault the streak had before it
// was made real, and the dashboard notes before them. A bar that cannot move
// is not a measurement, and sitting next to a chart that is one makes it
// worse rather than better.
//
// Each of these returns null when there is not enough behind it to be worth a
// percentage. Nothing to measure is a real answer, and it is a different
// answer from zero: a board with no deadlines on it has not missed any.

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Read the same way the Analytics page reads them, so the two pages cannot
// disagree about what "finished" means or where a due date lives.
function isDone(task) {
  return (task?.status || '').toLowerCase() === 'completed';
}

function dueDay(task) {
  const due = task?.dueDate || task?.deadline;

  return typeof due === 'string' && DAY_KEY.test(due) ? due : null;
}

function doneDay(task) {
  const done = task?.completedAt;

  return typeof done === 'string' && DAY_KEY.test(done) ? done : null;
}

function share(part, whole) {
  return Math.round((part / whole) * 100);
}

// How much of the board has actually been finished. The plainest of the
// three, and the one that answers "is this list being worked or only added
// to".
export function deliveryRate(tasks) {
  const all = tasks || [];

  if (all.length === 0) return null;

  const done = all.filter(isDone).length;

  return { pct: share(done, all.length), done, total: all.length };
}

// Of the work that carried a deadline and got finished, how much of it landed
// on time.
//
// Only tasks with both a deadline and a completion date can be judged: one
// without a deadline was never late, and one still open has not missed
// anything yet - it may still be finished today. Counting either would turn a
// board that simply does not use deadlines into a failing one.
export function onTimeRate(tasks) {
  const judged = (tasks || []).filter(
    (task) => isDone(task) && dueDay(task) && doneDay(task)
  );

  if (judged.length === 0) return null;

  // Date keys compare as text, which keeps the whole comparison inside the
  // local day both values were written in.
  const onTime = judged.filter((task) => doneDay(task) <= dueDay(task)).length;

  return { pct: share(onTime, judged.length), onTime, judged: judged.length };
}

// How many of the last fortnight's days had something finished on them.
//
// A streak answers "am I on a run right now" and breaks on a single quiet
// day. This is the other half: a fortnight with eleven working days in it
// reads as the steady stretch it was, whether or not it happens to be
// unbroken.
export const MOMENTUM_WINDOW = 14;

export function momentumRate(tasks, today = todayKey()) {
  const days = new Set();

  for (const task of tasks || []) {
    const day = doneDay(task);

    if (day) days.add(day);
  }

  if (days.size === 0) return null;

  let active = 0;
  let cursor = today;

  for (let step = 0; step < MOMENTUM_WINDOW; step += 1) {
    if (days.has(cursor)) active += 1;
    cursor = shiftDay(cursor, -1);
  }

  return { pct: share(active, MOMENTUM_WINDOW), active, window: MOMENTUM_WINDOW };
}
