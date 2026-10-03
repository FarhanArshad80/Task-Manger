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

// Tasks finished in the last seven days against the seven before them.
//
// The streak and momentum figures count days, so a day with one small job
// and a day with ten look the same to both. This counts the work itself,
// and puts it beside the week before so the number has something to be
// read against. Null when nothing has been finished in either week, where a
// "0 against 0" would only be noise.
export const PACE_WINDOW = 7;

export function weeklyPace(tasks, today = todayKey()) {
  const thisStart = shiftDay(today, -(PACE_WINDOW - 1));
  const lastStart = shiftDay(thisStart, -PACE_WINDOW);
  let thisWeek = 0;
  let lastWeek = 0;

  for (const task of tasks || []) {
    if (!isDone(task)) continue;

    const day = doneDay(task);

    if (!day || day > today) continue;
    if (day >= thisStart) thisWeek += 1;
    else if (day >= lastStart) lastWeek += 1;
  }

  if (thisWeek === 0 && lastWeek === 0) return null;

  return { thisWeek, lastWeek };
}

// Unfinished work split by priority, highest first.
//
// A task saved before the priority picker existed has none of its own and is
// counted as Medium, the same default the table and the calendar draw it
// with, so the three figures always add up to the open total.
export const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

export function openByPriority(tasks) {
  const counts = Object.fromEntries(PRIORITY_LEVELS.map((level) => [level, 0]));

  for (const task of tasks || []) {
    if (!task || isDone(task)) continue;

    const level = PRIORITY_LEVELS.includes(task.priority) ? task.priority : 'Medium';

    counts[level] += 1;
  }

  return PRIORITY_LEVELS.map((level) => ({ level, count: counts[level] }));
}

// The day of the week most work gets finished on.
//
// The streak and the weekly pace say how much is getting done, not when.
// Knowing that Tuesdays carry the week is what lets someone plan the heavy
// task for a Tuesday instead of hoping for one. Null until a few tasks have
// been finished, and on a tie, so one lucky day is not reported as a habit.
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_MIN_DONE = 3;

export function busiestWeekday(tasks) {
  const counts = WEEKDAYS.map(() => 0);
  let total = 0;

  for (const task of tasks || []) {
    if (!isDone(task)) continue;

    const day = doneDay(task);

    if (!day) continue;

    const [y, m, d] = day.split('-').map(Number);

    counts[new Date(y, m - 1, d).getDay()] += 1;
    total += 1;
  }

  if (total < WEEKDAY_MIN_DONE) return null;

  const top = Math.max(...counts);

  if (counts.filter((count) => count === top).length > 1) return null;

  return { day: WEEKDAYS[counts.indexOf(top)], count: top, total };
}

// How long finished work usually took, from the day it was added to the day
// it was ticked off.
//
// The pace and the streak count what got finished, not how long it sat
// first. The median rather than the mean, because one task left open for a
// quarter would otherwise drag the figure for every quick job around it.
// Null until a few tasks have both dates, so two lucky ones are not a trend.
export const TURNAROUND_MIN_DONE = 3;

function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);

  return Date.UTC(y, m - 1, d) / 86400000;
}

export function turnaround(tasks) {
  const spans = [];

  for (const task of tasks || []) {
    if (!isDone(task)) continue;

    const done = doneDay(task);
    const added = typeof task.date === 'string' && DAY_KEY.test(task.date) ? task.date : null;

    if (!done || !added) continue;

    // A completion stamped before the task was created is a bad record, not
    // a negative wait — usually an import carrying dates from elsewhere.
    const span = dayNumber(done) - dayNumber(added);

    if (span >= 0) spans.push(span);
  }

  if (spans.length < TURNAROUND_MIN_DONE) return null;

  spans.sort((a, b) => a - b);

  const mid = Math.floor(spans.length / 2);
  const median = spans.length % 2 ? spans[mid] : (spans[mid - 1] + spans[mid]) / 2;

  return { days: Math.round(median), count: spans.length };
}

// The unfinished task that has been on the board longest, by the day it was
// added.
//
// The open count says how much is left, not whether any of it is quietly
// going stale. A job added six weeks ago and never started is the one most
// worth a look, and nothing else on the page names it. Tasks without a
// usable added date are skipped rather than guessed at; on a tie the one
// listed first wins. Null when nothing open has a date.
export function oldestOpen(tasks, today = todayKey()) {
  let oldest = null;

  for (const task of tasks || []) {
    if (!task || isDone(task)) continue;

    const added = typeof task.date === 'string' && DAY_KEY.test(task.date) ? task.date : null;

    if (!added || added > today) continue;
    if (!oldest || added < oldest.added) oldest = { task, added };
  }

  if (!oldest) return null;

  return {
    title: oldest.task.title,
    added: oldest.added,
    days: dayNumber(today) - dayNumber(oldest.added),
  };
}
