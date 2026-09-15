// The part of a task that will not fit in its title.
//
// A title has to stay short enough to read down a column of forty of them,
// which makes it the wrong place for the link to the ticket, the name of the
// person who asked, or the two sentences explaining what "fix the export
// bug" actually turned out to mean. That context went into the title until
// it stopped fitting, and then it went nowhere — it lived in somebody's head
// or in a chat thread the task does not link to.
//
// Steps are not the answer to this either. A step is something to tick off;
// a note is something to read, and putting prose in a checklist leaves a
// line that can never legitimately be marked done.

// Long enough for a paragraph and a link, short enough that the panel stays
// a note rather than becoming a document. Past this it belongs in whatever
// the team writes documents in, with the link to it in here.
export const MAX_NOTE_LENGTH = 1000;

// What is safe to store on every keystroke.
//
// The full clean below cannot run while somebody is typing: it trims the
// ends, so the space between two words would be eaten the moment it was
// pressed and the next word would arrive stuck to the last one. All this
// does is settle the line endings and hold the length, which are the two
// things that have to be true of anything written to storage.
export function capNote(input) {
  if (input === null || input === undefined) return '';

  return String(input).replace(/\r\n?/g, '\n').slice(0, MAX_NOTE_LENGTH);
}

// The full clean, for every path that is handing over a finished note —
// loading one, importing a file, copying a task, or leaving the box.
//
// Line breaks survive, because a note with a list in it is a note people
// actually write. Runs of blank lines are collapsed so a stray paste cannot
// push the rest of the panel off the screen, and the ends are trimmed so a
// note of nothing but whitespace reads as the empty note it is.
export function normalizeNote(input) {
  if (input === null || input === undefined) return '';

  return String(input)
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_NOTE_LENGTH);
}

// What a spreadsheet cell can hold. The CSV writer quotes line breaks
// correctly, so they go out as they are — but a cell is one line high in
// most spreadsheets, and a note read back from one that helpfully converted
// them is still a note.
export function hasNote(task) {
  return normalizeNote(task?.note) !== '';
}
