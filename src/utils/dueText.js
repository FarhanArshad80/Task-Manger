// How far off a due date is, in the words somebody would use out loud.
//
// The table printed the date itself — '2026-09-24' — and left the reader to
// work out what that meant relative to today. That is arithmetic done once
// per row, on the one column people scan a task list to read, and it is
// arithmetic the board already has everything it needs to do.
//
// The date stays. This goes beside it, because "in 3 days" answers the
// question and the date answers "which day" — and anyone booking around a
// deadline needs both.

// Days are counted between calendar dates, not between moments. Two tasks due
// on the same day are equally due whatever time it happens to be, and a
// difference measured in elapsed hours would call tomorrow "today" for most
// of the afternoon.
function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);

  // UTC on both sides. The arithmetic is on whole dates, and a local
  // construction would land a day out whenever a daylight saving change falls
  // between the two.
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);

  return Math.round((to - from) / 86400000);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Near dates get names and far ones get counts. "In 1 day" is a thing nobody
// says, and "in 47 days" is a number nobody holds — past a fortnight the
// useful unit is weeks.
function distanceText(days) {
  if (days < 14) return plural(days, 'day');

  const weeks = Math.round(days / 7);

  return plural(weeks, 'week');
}

/**
 * A phrase for a task's due date, or '' when there is nothing worth saying.
 *
 * `deadline` and `today` are both 'YYYY-MM-DD'. Completed work is given no
 * phrase at all: whether it was finished late is a fact about the past, and
 * the point of this column is what still has to happen.
 */
export function dueText(task, today) {
  if (!task?.deadline || task.status === 'Completed') return '';

  const days = daysBetween(today, task.deadline);

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'a day late';
  if (days < 0) return `${distanceText(-days)} late`;

  return `in ${distanceText(days)}`;
}
