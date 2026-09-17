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

// How each tag is going, for the Analytics page.
//
// A tag is usually a project or an area of work, and "how is the launch
// going" is a question the status breakdown cannot answer: forty tasks at
// sixty percent done says nothing about whether it is the launch that is
// stuck or everything else. Grouped the same way `collectTags` groups them,
// so "API" and "api" are one row under the first spelling.
//
// Overdue is counted apart from open, because four open tasks and four late
// ones are not the same news, and a row that only showed the first would
// bury the second.
export function tagStats(tasks, today) {
  const byKey = new Map();
  const blank = (tag) => ({ tag, total: 0, done: 0, overdue: 0 });
  let untagged = blank(null);

  for (const task of tasks) {
    const done = task.status === 'Completed';
    const late = !done && Boolean(task.deadline) && task.deadline < today;
    const tags = task.tags || [];

    const buckets = tags.length === 0
      ? [untagged]
      : tags.map((tag) => {
        const key = tag.toLowerCase();
        if (!byKey.has(key)) byKey.set(key, blank(tag));
        return byKey.get(key);
      });

    for (const bucket of buckets) {
      bucket.total += 1;
      if (done) bucket.done += 1;
      if (late) bucket.overdue += 1;
    }
  }

  const finish = (row) => ({
    ...row,
    open: row.total - row.done,
    pct: row.total ? Math.round((row.done / row.total) * 100) : 0,
  });

  // Most outstanding work first — the row worth reading is the one with the
  // most still to do, not the one that happens to sort first alphabetically.
  const rows = [...byKey.values()]
    .map(finish)
    .sort((a, b) => b.open - a.open || a.tag.localeCompare(b.tag));

  return { rows, untagged: finish(untagged) };
}
