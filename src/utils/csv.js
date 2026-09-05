import { tagsToText } from './tags';

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
