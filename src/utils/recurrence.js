// Standing work: the weekly report, the monthly invoice, the checklist that
// comes round every release. Until now the only way to track it was to
// duplicate the task by hand each time and retype the date, which meant the
// next occurrence existed only as long as someone remembered to make it.
//
// A repeat is a property of the task rather than a separate schedule. When a
// repeating task is completed, the next one is created in its place — so the
// board always holds exactly one live copy of a standing job, never a row of
// future ones cluttering up the list weeks ahead of being actionable.

import { resetSteps } from './steps';

export const REPEAT_NONE = 'none';

export const REPEAT_OPTIONS = [
  { value: REPEAT_NONE, label: 'Does not repeat', short: '' },
  { value: 'daily', label: 'Repeats daily', short: 'Daily', days: 1 },
  { value: 'weekly', label: 'Repeats weekly', short: 'Weekly', days: 7 },
  { value: 'fortnightly', label: 'Repeats every 2 weeks', short: 'Every 2 weeks', days: 14 },
  { value: 'monthly', label: 'Repeats monthly', short: 'Monthly', months: 1 },
];

export const REPEAT_VALUES = REPEAT_OPTIONS.map((option) => option.value);

// Anything that is not one of the options is not a schedule, and a task with
// a schedule nothing understands would repeat on no day at all.
export function normalizeRepeat(value) {
  const wanted = String(value ?? '').trim().toLowerCase();

  return REPEAT_VALUES.includes(wanted) ? wanted : REPEAT_NONE;
}

export function isRepeating(task) {
  return normalizeRepeat(task?.repeat) !== REPEAT_NONE;
}

export function repeatLabel(value) {
  return REPEAT_OPTIONS.find((option) => option.value === normalizeRepeat(value))?.short || '';
}

// One step forward. Dates are the same local 'YYYY-MM-DD' keys the rest of
// the app compares as strings, so the arithmetic is done on a real Date and
// handed straight back as a key rather than by adding to the digits.
export function advanceDateKey(dateKey, repeat) {
  const option = REPEAT_OPTIONS.find((entry) => entry.value === normalizeRepeat(repeat));

  if (!option || (!option.days && !option.months)) return dateKey;

  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  if (option.days) {
    date.setDate(date.getDate() + option.days);
  } else {
    // The 31st of a month is a real due date, and the month after it may not
    // have one. Setting the day first would roll March 31 into May 1 by way
    // of an overflowing April, so the month moves on its own and the day is
    // clamped to what that month actually holds.
    const target = new Date(y, m - 1 + option.months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

    date.setFullYear(target.getFullYear(), target.getMonth(), Math.min(d, lastDay));
  }

  return date.toLocaleDateString('en-CA');
}

// How far a schedule has to be wound on to land in the future. A weekly chore
// ticked off three weeks late should come back next week, not arrive already
// two occurrences overdue — and it certainly should not arrive as three of
// them. So the date is stepped until it is genuinely ahead of today.
const MAX_STEPS = 400;

export function nextDeadline(task, today) {
  const repeat = normalizeRepeat(task?.repeat);

  if (repeat === REPEAT_NONE) return null;

  // A repeating task with no due date is a rhythm rather than a deadline —
  // "every week, some time". Counting from today keeps that rhythm without
  // inventing a due date the task never had.
  let cursor = task.deadline || today;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (cursor > today) return task.deadline ? cursor : null;

    cursor = advanceDateKey(cursor, repeat);
  }

  return task.deadline ? cursor : null;
}

// The task that takes the place of one just completed. Same shape, same tags
// and same schedule; a fresh id, and back to Pending because it is work still
// to do rather than work already done.
export function nextOccurrence(task, today, createId) {
  return {
    ...task,
    id: createId(),
    status: 'Pending',
    // The predecessor's completion date belongs to the predecessor. Carried
    // over, it would report this occurrence as finished before it existed.
    completedAt: null,
    // The checklist comes back blank. Last week's report is written; this
    // week's is not, and a repeating job whose steps arrived pre-ticked
    // would be a checklist nobody could use twice.
    steps: resetSteps(task.steps),
    // Created now, not whenever the first occurrence was — this one came
    // into being the moment its predecessor was ticked off.
    date: today,
    deadline: nextDeadline(task, today),
    // A pin is about today, and this occurrence is about a week from now.
    // Inheriting it would mean a standing job pinned once stayed pinned for
    // as long as it kept recurring, which is the one way a pin stops meaning
    // anything.
    pinned: false,
    tags: [...(task.tags || [])],
  };
}
