export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 20;

// Tags come in as whatever was typed into a comma-separated box, so they are
// cleaned once here and every path — creating, editing, importing — goes
// through it rather than each trusting its own input.
export function normalizeTags(input) {
  const entries = Array.isArray(input) ? input : String(input ?? '').split(',');
  const seen = new Set();
  const tags = [];

  for (const entry of entries) {
    const tag = String(entry).trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;

    // "API" and "api" are one tag, and the first spelling is the one kept —
    // otherwise the filter list fills with the same label twice.
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);

    if (tags.length === MAX_TAGS) break;
  }

  return tags;
}

export function tagsToText(tags) {
  return (tags || []).join(', ');
}

// Case-insensitive, because that is how they were deduplicated going in.
export function hasTag(task, tag) {
  const wanted = tag.toLowerCase();

  return (task.tags || []).some((t) => t.toLowerCase() === wanted);
}

// Every tag in use across the board, one entry per spelling family, ordered
// so the filter list does not reshuffle as tasks are added.
export function collectTags(tasks) {
  const byKey = new Map();

  for (const task of tasks) {
    for (const tag of task.tags || []) {
      const key = tag.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, tag);
    }
  }

  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
