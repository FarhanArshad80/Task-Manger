// The steps a task is actually made of.
//
// "Draft technical project documentation" is not one action, it is five, and
// until now the board offered two ways to hold that: split it into five rows
// - which buries the real work under its own bookkeeping, and counts five
// completions where one job was done - or keep the list in your head.
//
// Steps belong to their task. They are not tasks themselves: they carry no
// deadline, no priority and no status of their own, and they never appear in
// the counts on the dashboard. A task with four of five steps ticked is one
// unfinished task, which is exactly what it was before anyone wrote the steps
// down.

export const MAX_STEPS = 20;
export const MAX_STEP_LENGTH = 120;

let stepSequence = 0;

function createStepId() {
  stepSequence += 1;

  return `s${Date.now().toString(36)}-${stepSequence.toString(36)}`;
}

// Every path in - typing one, editing a task, importing a file - goes through
// here rather than each trusting its own input.
export function normalizeSteps(input) {
  if (!Array.isArray(input)) return [];

  const steps = [];

  for (const entry of input) {
    const text = String(entry?.text ?? entry ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_STEP_LENGTH);

    if (!text) continue;

    steps.push({
      id: typeof entry?.id === "string" && entry.id ? entry.id : createStepId(),
      text,
      done: Boolean(entry?.done),
    });

    if (steps.length === MAX_STEPS) break;
  }

  return steps;
}

export function makeStep(text) {
  const [step] = normalizeSteps([{ text, done: false }]);

  return step || null;
}

// Done over total, and whether the list is finished. A task with no steps
// returns null rather than 0 of 0: there is nothing to report, and "0/0"
// on every row that never used the feature is noise.
export function stepProgress(steps) {
  const list = Array.isArray(steps) ? steps : [];

  if (list.length === 0) return null;

  const done = list.filter((step) => step.done).length;

  return { done, total: list.length, complete: done === list.length };
}

// A copy of the list with nothing ticked, for the places that inherit steps
// from a task that is finished with them - a duplicate, and the next
// occurrence of a repeating task. Both are work still to do.
export function resetSteps(steps) {
  return normalizeSteps(steps).map((step) => ({
    ...step,
    id: createStepId(),
    done: false,
  }));
}

// Written for a spreadsheet as "[x] done thing | [ ] undone thing". Checkbox
// notation because it survives being read by a person, and a pipe because a
// comma would be quoted by the CSV writer on almost every row.
const STEP_SEPARATOR = " | ";

export function stepsToText(steps) {
  return normalizeSteps(steps)
    .map((step) => `[${step.done ? "x" : " "}] ${step.text}`)
    .join(STEP_SEPARATOR);
}

export function textToSteps(text) {
  return normalizeSteps(
    String(text ?? "")
      .split("|")
      .map((entry) => {
        const raw = entry.trim();

        if (!raw) return null;

        // A leading [x] or [ ] sets the state; anything without one is an
        // unticked step, which is what a hand-written list looks like.
        const match = /^\[([ xX])\]\s*(.*)$/.exec(raw);

        return match
          ? { text: match[2], done: match[1].toLowerCase() === "x" }
          : { text: raw, done: false };
      })
      .filter(Boolean)
  );
}
