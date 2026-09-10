// Consecutive days on which something was finished.
//
// The Progress page has been showing "12 Days" since it was written - a
// number typed into the markup, next to a label naming a different app
// entirely. A figure nobody can move by using the product is worse than no
// figure: it is the one number on the page that can never be wrong, and so
// the one nobody should believe.

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

export function shiftDay(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  date.setDate(date.getDate() + days);

  return date.toLocaleDateString('en-CA');
}

/**
 * The current run of days with at least one completion, counting back from
 * today.
 *
 * A streak that ended yesterday is still alive. Nothing has been finished
 * today yet, but the day is not over either, and a counter that resets at
 * midnight would spend every morning telling people they had lost something
 * they still have. Two clear days is what actually breaks it.
 */
export function completionStreak(tasks, today = todayKey()) {
  const days = new Set();

  for (const task of tasks || []) {
    const day = task?.completedAt;

    if (typeof day === 'string' && DAY_KEY.test(day)) days.add(day);
  }

  if (days.size === 0) return { days: 0, best: 0, lastDay: null };

  // Where to start counting back from. Today if something was finished
  // today, otherwise yesterday - and if neither, there is no live run.
  let cursor = days.has(today) ? today : shiftDay(today, -1);

  let current = days.has(cursor) ? 0 : -1;

  while (days.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  // The longest run ever recorded, which is what makes today's run mean
  // something. Sorted keys compare as plain text, so no dates are parsed.
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    run = shiftDay(sorted[i], -1) === sorted[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }

  return {
    days: Math.max(current, 0),
    best,
    lastDay: sorted[sorted.length - 1],
  };
}
