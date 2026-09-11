import { normalizeTags, tagsToText } from './tags';
import { normalizeRepeat, REPEAT_NONE, REPEAT_VALUES } from './recurrence';
import { stepsToText, textToSteps } from './steps';

// The columns a spreadsheet actually wants, in the order the table shows
// them. `read` returns a plain string; the quoting rules below are the only
// thing that decides how it ends up in the file.
const COLUMNS = [
  { header: 'Task', read: (task) => task.title },
  { header: 'Status', read: (task) => task.status },
  { header: 'Priority', read: (task) => task.priority || 'Medium' },
  { header: 'Created', read: (task) => task.date || '' },
  { header: 'Due', read: (task) => task.deadline || '' },
  { header: 'Tags', read: (task) => tagsToText(task.tags) },
  // Empty for anything unfinished, which is most of the file - "none" in
  // every second row would be noise.
  { header: 'Completed', read: (task) => task.completedAt || '' },
  // "[x] done thing | [ ] the next one". Checkbox notation because it still
  // reads as a checklist to a person opening the file, and a pipe because a
  // comma would have the writer quoting almost every row.
  { header: 'Steps', read: (task) => stepsToText(task.steps) },
  // Written as the schedule's own name rather than a label, so a file can be
  // round-tripped through a spreadsheet and still come back as a schedule.
  // A one-off leaves the cell empty instead of saying "none" in every row.
  {
    header: 'Repeat',
    read: (task) => {
      const repeat = normalizeRepeat(task.repeat);

      return repeat === REPEAT_NONE ? '' : repeat;
    },
  },
];

// A field needs quoting if it contains a comma, a quote or a line break, and
// a quote inside a quoted field is written twice. Task titles are free text
// typed by a person, so all three turn up — "Fix login, then deploy" would
// otherwise arrive in the spreadsheet as two columns.
function escapeField(value) {
  const text = String(value ?? '');

  if (!/[",\r\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

// CRLF line endings, because that is what the CSV spec says and what Excel
// expects; everything else reads them happily either way.
export function tasksToCsv(tasks) {
  const rows = [COLUMNS.map((column) => column.header)];

  for (const task of tasks) {
    rows.push(COLUMNS.map((column) => column.read(task)));
  }

  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

export function csvFilename(date = new Date()) {
  return `tasks-${date.toLocaleDateString('en-CA')}.csv`;
}

// A BOM so Excel reads the file as UTF-8 rather than guessing at the local
// codepage and turning every accent into mojibake.
export function downloadCsv(text, filename) {
  const blob = new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // The blob stays in memory until its URL is handed back, and this one has
  // done its job the moment the click is dispatched.
  URL.revokeObjectURL(url);
}

// Reading one back in. A CSV file is not a list of lines split on commas: a
// quoted field can hold commas, line breaks and quotes of its own, written
// twice. The export above produces all three, so anything less than a real
// parser would fail on files this very app wrote - which is the first thing
// anyone will try to import.
//
// Walking the text a character at a time is what makes those cases come out
// right, and it is short enough not to be worth a dependency.
export function parseCsv(text) {
  // The export writes a BOM so Excel reads it as UTF-8. Left in place it
  // becomes part of the first header and no column matches anything.
  const source = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (source[i + 1] === '"') {
        // A doubled quote is one literal quote and stays inside the field.
        field += '"';
        i += 1;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      // CRLF is one line break, not a break followed by an empty row.
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // A file that ends without a trailing newline still has a final row, and
  // whatever is in hand when the text runs out is its last field.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Blank lines are punctuation in a spreadsheet, not tasks.
  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''));
}

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Case and spacing drift with whoever edited the file in between, so a value
// is matched by what it means. Anything that is not one of the options falls
// back rather than putting the table into a state it cannot render.
function matchOption(value, options, fallback) {
  const wanted = value.trim().toLowerCase();

  return options.find((option) => option.toLowerCase() === wanted) || fallback;
}

// Columns are found by name, not position, so a file with them reordered -
// or with extra ones a spreadsheet added along the way - still lands in the
// right fields. Headers nobody recognises are ignored.
function headerPositions(headerRow) {
  const positions = {};

  headerRow.forEach((cell, position) => {
    const key = cell.trim().toLowerCase();
    const column = COLUMNS.find((entry) => entry.header.toLowerCase() === key);

    if (column) positions[column.header] = position;
  });

  return positions;
}

// Anything coming off disk is a stranger: hand-edited, written by a different
// tool, or simply the wrong file. Every task is rebuilt field by field from
// what is actually there, and rows that cannot be read are counted rather
// than silently dropped - a file where half the lines vanished should say so.
export function csvToTasks(text, today = new Date().toLocaleDateString('en-CA')) {
  const rows = parseCsv(text);

  if (rows.length === 0) return { tasks: [], skipped: 0, missingHeader: false };

  const positions = headerPositions(rows[0]);

  // Without a Task column there is no description to import, and every other
  // field describes something that would have no name.
  if (positions.Task === undefined) {
    return { tasks: [], skipped: 0, missingHeader: true };
  }

  const read = (row, header) => {
    const position = positions[header];

    return position === undefined ? '' : String(row[position] ?? '').trim();
  };

  const tasks = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const title = read(row, 'Task');

    // A row with no description is a stray line, not a task.
    if (!title) {
      skipped += 1;
      continue;
    }

    const created = read(row, 'Created');
    const due = read(row, 'Due');
    const finished = read(row, 'Completed');

    tasks.push({
      title,
      status: matchOption(read(row, 'Status'), STATUSES, 'Pending'),
      priority: matchOption(read(row, 'Priority'), PRIORITIES, 'Medium'),
      // A file exported months ago carries the day each task was made, and
      // that is worth keeping. A missing or malformed one becomes today,
      // because the alternative is a blank column in the table.
      date: DATE_KEY.test(created) ? created : today,
      // No due date is a real answer and has to survive as null.
      deadline: DATE_KEY.test(due) ? due : null,
      // Only believed on a row that says it is finished. A completion date
      // against a Pending task is a contradiction, and the status column is
      // the one the rest of the app reads.
      completedAt:
        DATE_KEY.test(finished) && matchOption(read(row, 'Status'), STATUSES, 'Pending') === 'Completed'
          ? finished
          : null,
      tags: normalizeTags(read(row, 'Tags')),
      // An unrecognised schedule becomes a one-off. Importing a task that
      // repeats on terms this app cannot honour would leave it silently
      // never coming back.
      repeat: matchOption(read(row, 'Repeat'), REPEAT_VALUES, REPEAT_NONE),
      // A hand-written list with no checkboxes at all reads as steps nobody
      // has started, which is what somebody typing one into a spreadsheet
      // column means by it.
      steps: textToSteps(read(row, 'Steps')),
    });
  }

  return { tasks, skipped, missingHeader: false };
}
