import React, { createContext, useState, useEffect } from 'react';
import { normalizeTags } from '../utils/tags';
import { isRepeating, normalizeRepeat, nextOccurrence, REPEAT_NONE } from '../utils/recurrence';
import { makeStep, normalizeSteps, resetSteps } from '../utils/steps';
import { capNote, normalizeNote } from '../utils/notes';

export const AppContext = createContext();

const TASKS_KEY = 'taskengine.tasks';
const THEME_KEY = 'taskengine.theme';

// Ids only ever get compared to each other, so the clock is enough to order
// them - but a bare timestamp is not enough to tell them apart. Creating a
// dozen tasks inside the same millisecond is exactly what importing a file
// does, and identical ids would give every one of them the edits, the status
// changes and the deletes meant for the first.
let idSequence = 0;

function createId() {
  idSequence += 1;

  return `${Date.now().toString(36)}-${idSequence.toString(36)}`;
}

const seedTasks = [
  { id: '1', title: 'Review system architecture', status: 'Completed', priority: 'High', date: '2026-07-18' },
  { id: '2', title: 'Fix API context middleware bug', status: 'In Progress', priority: 'High', date: '2026-07-19' },
  { id: '3', title: 'Draft technical project documentation', status: 'Pending', priority: 'Medium', date: '2026-07-20' },
];

// Storage can be unavailable (private mode, blocked cookies) or hold stale
// junk, so every read falls back to the defaults rather than throwing.
function loadTasks() {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    if (!saved) return seedTasks;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedTasks;
  } catch {
    return seedTasks;
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const AppProvider = ({ children }) => {
  // Core tasks state initialization
  const [tasks, setTasks] = useState(loadTasks);

  const [theme, setTheme] = useState(loadTheme);

  // A delete is the one action here that cannot be talked out of afterwards,
  // and a bulk delete takes a screenful at once. What was removed is held —
  // with the row each task occupied — until the undo window closes, so the
  // list can be put back the way it was read rather than reappearing at the
  // bottom in a new order.
  //
  // Deliberately not persisted: an undo offer that outlives the tab it was
  // made in is a task quietly coming back days later.
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // Nothing useful to do if the write is rejected — keep the app running.
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Same here: a failed preference write should not break rendering.
    }
  }, [theme]);

  // Toggle app theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Task CRUD operations
  const addTask = (task) => {
    setTasks((prev) => [
      ...prev,
      {
        ...task,
        tags: normalizeTags(task.tags),
        repeat: normalizeRepeat(task.repeat),
        steps: normalizeSteps(task.steps),
        note: normalizeNote(task.note),
        // Nothing arrives pinned. A pin says "this one, before the others",
        // which is a judgement about a board — it cannot be true of a task
        // that has not met the board yet.
        pinned: task.pinned === true,
        id: createId(),
      },
    ]);
  };

  // Completing a repeating task is the one status change that creates work
  // rather than only closing it: the standing job is not finished, it is due
  // again. The next occurrence is inserted directly behind the one just
  // ticked off, so the row appears where the eye already is.
  //
  // Both the single and the bulk path go through here, because ticking off
  // twelve weekly chores by checkbox has to leave twelve next occurrences,
  // exactly as ticking them off one at a time would.
  const applyStatus = (prev, target, newStatus) => {
    const today = new Date().toLocaleDateString('en-CA');
    const next = [];

    for (const task of prev) {
      if (!target.has(task.id)) {
        next.push(task);
        continue;
      }

      // When a task was finished, not just that it was. The analytics page
      // has been asking every task for a `completedAt` since it was written
      // and no path in the app ever set one, so its on-time figure could
      // only ever read "—".
      //
      // Moving a task back out of Completed clears it again: it is not
      // finished any more, and a stale date would go on counting toward an
      // accuracy figure and a streak that nothing on the board supports.
      const updated = {
        ...task,
        status: newStatus,
        completedAt:
          newStatus === 'Completed'
            ? task.completedAt || today
            : null,
        // Finishing something releases its pin. A pin says "this is what I
        // am on", and the one thing that is certainly no longer true of a
        // task is that — so a finished row that held its place at the top of
        // the board would push the work that is still to do underneath it.
        pinned: newStatus === 'Completed' ? false : task.pinned,
      };
      next.push(updated);

      // Only on the crossing into Completed. Re-confirming a status a task
      // already holds is a no-op everywhere else in the app, and here it
      // would quietly mint a duplicate every time it happened.
      if (newStatus === 'Completed' && task.status !== 'Completed' && isRepeating(task)) {
        next.push(nextOccurrence(updated, today, createId));
      }
    }

    return next;
  };

  const updateTaskStatus = (id, newStatus) => {
    setTasks((prev) => applyStatus(prev, new Set([id]), newStatus));
  };

  // Priority says how much a task matters. It does not say which one to do
  // next, and on a board where a dozen things are honestly High it cannot —
  // that is what gets rewritten every morning and then ignored, because
  // everything urgent means nothing is.
  //
  // A pin is the other question: of all this, which am I on today. It is
  // deliberately not a fourth priority level. It belongs to the person
  // rather than to the work, it is expected to move every day, and a handful
  // of pins is a plan where a column of High is a wish.
  const togglePin = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, pinned: !task.pinned } : task
      )
    );
  };

  // Status was the only thing a task could change its mind about. A typo in
  // the title, a deadline that moved, a job that turned out to be urgent —
  // all of those meant deleting the task and typing it again from scratch.
  const updateTask = (id, changes) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;

        const title = (changes.title ?? task.title).trim();

        return {
          ...task,
          ...changes,
          // An empty title would leave an unidentifiable row, so the old
          // one stands rather than the task losing its name.
          title: title || task.title,
          // Clearing the date field means "no deadline", which is a real
          // answer and has to survive as null rather than an empty string.
          deadline: changes.deadline || null,
          // Tags are only touched when the edit actually mentions them, so a
          // status change from elsewhere cannot quietly strip them.
          tags: 'tags' in changes ? normalizeTags(changes.tags) : task.tags || [],
          // Same rule for the schedule: an edit that says nothing about
          // repeating leaves a standing job standing.
          repeat: 'repeat' in changes ? normalizeRepeat(changes.repeat) : normalizeRepeat(task.repeat),
          // And for the checklist. Steps are edited through their own
          // actions below, so a title change arriving here must not flatten
          // them on its way past.
          steps: 'steps' in changes ? normalizeSteps(changes.steps) : normalizeSteps(task.steps),
          // And for the note, which is written through its own action below
          // — an edit that says nothing about it must leave it standing.
          note: 'note' in changes ? normalizeNote(changes.note) : normalizeNote(task.note),
        };
      })
    );
  };

  // Standing work recurs: the same weekly report, the same release checklist,
  // the same three steps for every new client. Re-typing the title, tags,
  // priority and deadline each time is the kind of work a task manager is
  // supposed to be saving.
  const duplicateTask = (id) => {
    setTasks((prev) => {
      const index = prev.findIndex((task) => task.id === id);
      if (index === -1) return prev;

      const source = prev[index];
      const copy = {
        ...source,
        id: createId(),
        // A copy is work still to do, whatever became of the original, and
        // it is created now rather than whenever the original was.
        status: 'Pending',
        // Which is why it cannot inherit the day the original was finished.
        completedAt: null,
        date: new Date().toLocaleDateString('en-CA'),
        // The deadline belonged to that occurrence, not to the shape of the
        // task — inheriting it would file half these copies as overdue on
        // the day they are made.
        deadline: null,
        // A copy is a one-off taken from a standing job, not a second
        // standing job. Two tasks on the same schedule would each spawn
        // their own next occurrence and the board would double every cycle.
        repeat: REPEAT_NONE,
        // The steps come across, none of them ticked. That is the whole
        // value of duplicating a checklist - the shape of the job, ready to
        // be done again.
        steps: resetSteps(source.steps),
        // The note comes across untouched. It says what the job is, which is
        // exactly what is being copied — unlike the deadline and the
        // completion date, which belonged to that one occurrence.
        note: normalizeNote(source.note),
        // A pin marks the one row being worked on now. Two rows cannot both
        // be that, so the copy starts clean — and a duplicate that arrived
        // already pinned would quietly push the original down the board it
        // was copied from.
        pinned: false,
        tags: [...(source.tags || [])],
      };

      const next = [...prev];
      // Directly below the original, where the eye already is — appending to
      // the end would put it out of sight in any list worth duplicating from.
      next.splice(index + 1, 0, copy);

      return next;
    });
  };

  // Work arrives from somewhere else more often than a task manager likes to
  // admit — a spreadsheet a client sent, a backlog exported from whatever the
  // team used before, or this app's own CSV carried between two machines.
  // Until now the only way in was typing it all again.
  //
  // The rows arrive already cleaned by the CSV reader; what this owns is
  // giving them ids nothing else holds, and putting them at the end rather
  // than interleaving a stranger's list with work already in progress.
  const importTasks = (incoming) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return 0;

    setTasks((prev) => [
      ...prev,
      ...incoming.map((task) => ({ ...task, id: createId() })),
    ]);

    return incoming.length;
  };

  // Steps are edited one at a time rather than by replacing the list, so two
  // things being ticked in quick succession cannot overwrite each other with
  // a stale copy of the checklist.
  const addStep = (taskId, text) => {
    const step = makeStep(text);

    if (!step) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const steps = normalizeSteps(task.steps);

        return { ...task, steps: normalizeSteps([...steps, step]) };
      })
    );
  };

  const toggleStep = (taskId, stepId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: normalizeSteps(task.steps).map((step) =>
                step.id === stepId ? { ...step, done: !step.done } : step
              ),
            }
          : task
      )
    );
  };

  // Written straight onto the task rather than through the row editor: the
  // note is edited in a panel of its own, and routing it through `updateTask`
  // would make every keystroke in it also re-normalize the title, the tags
  // and the schedule from a draft nobody opened.
  // `commit` is the difference between typing and having typed. Every
  // keystroke only settles the line endings and holds the length; the full
  // clean waits until the box is left, because trimming the ends mid-word
  // would eat the space somebody just pressed.
  const setTaskNote = (taskId, note, commit = false) => {
    const next = commit ? normalizeNote(note) : capNote(note);

    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, note: next } : task))
    );
  };

  const removeStep = (taskId, stepId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              steps: normalizeSteps(task.steps).filter((step) => step.id !== stepId),
            }
          : task
      )
    );
  };

  const deleteTask = (id) => {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return;

    setRecentlyDeleted({ entries: [{ task: tasks[index], index }] });
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Bulk edits take the whole set in one pass rather than looping the single
  // -task calls: those would queue an update per task and rewrite storage
  // that many times for what the user experienced as one action.
  const updateTasksStatus = (ids, newStatus) => {
    const target = new Set(ids);

    setTasks((prev) => applyStatus(prev, target, newStatus));
  };

  // Priority is the field that gets rewritten in batches — a sprint slips
  // and a dozen tasks drop to Low, a release date lands and a dozen go High.
  // Doing that one row at a time meant reopening each editor in turn.
  const updateTasksPriority = (ids, priority) => {
    const target = new Set(ids);

    setTasks((prev) =>
      prev.map((task) => (target.has(task.id) ? { ...task, priority } : task))
    );
  };

  // Deadlines move in batches for the same reason priorities do: a release
  // slips and everything hanging off it slips with it, or a week of work gets
  // pulled forward at once. Doing that a row at a time meant opening every
  // editor in turn and typing the same date into each.
  //
  // An empty value is a real answer rather than a no-op — it means the work
  // is still to do, just not to a date — so it clears the deadline instead of
  // being ignored.
  const updateTasksDeadline = (ids, deadline) => {
    const target = new Set(ids);

    setTasks((prev) =>
      prev.map((task) =>
        target.has(task.id) ? { ...task, deadline: deadline || null } : task
      )
    );
  };

  const deleteTasks = (ids) => {
    const target = new Set(ids);
    const entries = [];

    tasks.forEach((task, index) => {
      if (target.has(task.id)) entries.push({ task, index });
    });

    if (entries.length === 0) return;

    setRecentlyDeleted({ entries });
    setTasks((prev) => prev.filter((task) => !target.has(task.id)));
  };

  // Each task goes back to the index it was taken from, oldest index first,
  // so re-inserting one does not push the next one past its own slot.
  const restoreDeleted = () => {
    if (!recentlyDeleted) return;

    const { entries } = recentlyDeleted;

    setTasks((prev) => {
      const next = [...prev];

      for (const { task, index } of entries) {
        // A task re-created under the same id while the offer was open is
        // already back; putting it in twice would give the table two rows
        // that every later edit would change together.
        if (next.some((existing) => existing.id === task.id)) continue;

        next.splice(Math.min(index, next.length), 0, task);
      }

      return next;
    });

    setRecentlyDeleted(null);
  };

  const dismissDeleted = () => setRecentlyDeleted(null);

  return (
    <AppContext.Provider
      value={{
        tasks,
        theme,
        toggleTheme,
        addTask,
        importTasks,
        duplicateTask,
        togglePin,
        updateTask,
        addStep,
        toggleStep,
        removeStep,
        setTaskNote,
        updateTaskStatus,
        updateTasksStatus,
        updateTasksPriority,
        updateTasksDeadline,
        deleteTask,
        deleteTasks,
        recentlyDeleted,
        restoreDeleted,
        dismissDeleted,
      }}
    >
      <div className={theme === 'dark' ? 'dark bg-slate-900 text-white min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
        {children}
      </div>
    </AppContext.Provider>
  );
};
