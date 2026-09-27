// How many open tasks are past their deadline.
//
// Same rule as the table's Overdue filter: a deadline before today on work
// that is not finished. Completed work is not late however late it was
// finished.
//
// Shared because more than one place now reports it - the sidebar badge and
// the browser tab - and two copies of a rule are two answers waiting to
// drift apart.
export function countOverdue(tasks, today) {
  return (tasks || []).filter(
    (task) => Boolean(task.deadline) && task.deadline < today && task.status !== 'Completed'
  ).length;
}
