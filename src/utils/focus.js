// Focus sessions: a timed stretch of work spent on one task.
//
// The board says what is to be done and when it is due, but never how long
// anything took. Time spent is the figure that makes the next estimate
// honest, and a timer that writes it down is the cheapest way to have it.

// The classic Pomodoro lengths. Long enough to get into something, short
// enough that a break comes round before attention runs out.
export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;

// A countdown as m:ss. Minutes are not padded: "5:00" reads faster than
// "05:00", and the timer never runs past an hour.
export function clockText(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
