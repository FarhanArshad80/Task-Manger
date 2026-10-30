// How many open tasks are past their deadline.
//
// Same rule as the table's Overdue filter: a deadline before today on work
// that is not finished. Completed work is not late however late it was
// finished.
//
// Shared because more than one place now reports it - the sidebar badge and
// the browser tab - and two copies of a rule are two answers waiting to
// drift apart.
export function listOverdue(tasks, today) {
  return (tasks || []).filter(
    (task) => Boolean(task.deadline) && task.deadline < today && task.status !== 'Completed'
  );
}

export function countOverdue(tasks, today) {
  return listOverdue(tasks, today).length;
}

// A badge's hover text: the first few task names, then how many more. A
// count says something has slipped; the names say what.
export function taskNamesText(tasks, shown = 5) {
  const names = tasks.slice(0, shown).map((task) => task.title);
  const rest = tasks.length - names.length;

  return rest > 0 ? `${names.join('\n')}\n…and ${rest} more` : names.join('\n');
}
