import { completionStreak, todayKey } from './streak';

// What the board actually says this morning.
//
// The Dashboard has carried two "Quick System Notes" since it was written,
// both typed into the markup: a line about database links and a line about
// middleware bugs. Neither has ever been true of anybody's tasks, and neither
// can be changed by using the app. That is the same fault the streak had
// before it was made real - a panel that cannot be wrong is a panel nobody
// should read.
//
// So the notes are read off the tasks instead. Each one names something that
// is true right now and would be worth acting on before anything else on the
// page.

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// How many notes the panel shows. It sits beside the chart as a glance, not
// a second task list - past three it stops being a briefing and starts being
// something else to read.
const MAX_NOTES = 3;

// Far enough out to plan the week around, near enough that it is still this
// week's problem.
const HORIZON_DAYS = 7;

function isOpen(task) {
  return task?.status !== 'Completed';
}

function dueDay(task) {
  const deadline = task?.deadline;

  return typeof deadline === 'string' && DAY_KEY.test(deadline) ? deadline : null;
}

// Date keys sort and compare as plain text, so nothing here parses a Date -
// which also keeps every comparison in the local day the rest of the app
// writes its dates in.
function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);

  return Math.round(
    (new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd)) / 86400000
  );
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * The notes worth showing, most urgent first, capped at three.
 *
 * Order is the whole point: something already late outranks something due
 * today, which outranks work that has no date on it at all. A board with
 * nothing wrong with it still gets a line, because "nothing is overdue" is
 * information too - and an empty panel reads as broken rather than calm.
 */
export function buildBriefing(tasks, today = todayKey()) {
  const open = (tasks || []).filter(isOpen);
  const notes = [];

  const overdue = open.filter((task) => {
    const day = dueDay(task);

    return day && day < today;
  });

  if (overdue.length > 0) {
    // The oldest one, because "three tasks are late" and "three tasks are
    // late, one of them by a fortnight" are different situations.
    const oldest = overdue.reduce((worst, task) =>
      dueDay(task) < dueDay(worst) ? task : worst
    );
    const late = daysBetween(dueDay(oldest), today);

    notes.push({
      id: 'overdue',
      tone: 'late',
      text: `${plural(overdue.length, 'task')} past the deadline — "${oldest.title}" by ${plural(late, 'day')}.`,
    });
  }

  const dueToday = open.filter((task) => dueDay(task) === today);

  if (dueToday.length > 0) {
    notes.push({
      id: 'today',
      tone: 'now',
      text:
        dueToday.length === 1
          ? `"${dueToday[0].title}" is due today.`
          : `${plural(dueToday.length, 'task')} due today.`,
    });
  }

  const soon = open.filter((task) => {
    const day = dueDay(task);

    if (!day || day <= today) return false;

    return daysBetween(today, day) <= HORIZON_DAYS;
  });

  if (soon.length > 0) {
    notes.push({
      id: 'soon',
      tone: 'ahead',
      text: `${plural(soon.length, 'task')} due in the next ${HORIZON_DAYS} days.`,
    });
  }

  // High priority with no date on it is the work that quietly never happens:
  // it is never late, so it never appears above, and it never surfaces in a
  // deadline sort either.
  const undated = open.filter((task) => task.priority === 'High' && !dueDay(task));

  if (undated.length > 0) {
    notes.push({
      id: 'undated',
      tone: 'ahead',
      text: `${plural(undated.length, 'high-priority task')} with no deadline set.`,
    });
  }

  const streak = completionStreak(tasks, today);

  if (streak.days > 1) {
    notes.push({
      id: 'streak',
      tone: 'good',
      text: `Something finished ${streak.days} days running.`,
    });
  }

  if (notes.length === 0) {
    notes.push({
      id: 'clear',
      tone: 'good',
      text:
        open.length === 0
          ? 'Nothing open. The queue is clear.'
          : `Nothing overdue and nothing due today — ${plural(open.length, 'task')} still open.`,
    });
  }

  return notes.slice(0, MAX_NOTES);
}
