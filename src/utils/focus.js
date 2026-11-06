// Focus sessions: a timed stretch of work spent on one task.
//
// The board says what is to be done and when it is due, but never how long
// anything took. Time spent is the figure that makes the next estimate
// honest, and a timer that writes it down is the cheapest way to have it.

// The classic Pomodoro lengths. Long enough to get into something, short
// enough that a break comes round before attention runs out.
export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;

// Lengths on offer for a focus session. Fifteen for the job that only needs
// starting, fifty for the deep stretch some work needs before it moves.
export const FOCUS_CHOICES = [15, 25, 50];

// A countdown as m:ss. Minutes are not padded: "5:00" reads faster than
// "05:00", and the timer never runs past an hour.
export function clockText(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Sessions are stored on the task as [{ day: 'YYYY-MM-DD', minutes }].
// Anything else that turns up there - an import from an older version, a
// hand-edited file - is dropped rather than allowed to break the sums.
export function normalizeFocus(input) {
  if (!Array.isArray(input)) return [];

  return input.filter(
    (entry) =>
      entry &&
      typeof entry.day === 'string' &&
      DAY_KEY.test(entry.day) &&
      Number.isFinite(entry.minutes) &&
      entry.minutes > 0
  );
}

// Every minute ever focused on one task.
export function focusTotal(task) {
  return normalizeFocus(task?.focus).reduce((sum, entry) => sum + entry.minutes, 0);
}

// Minutes focused on one day, per task, busiest first. Tasks with nothing
// that day are left out so the list is only what actually happened.
export function focusOnDay(tasks, day) {
  return tasks
    .map((task) => {
      const sessions = normalizeFocus(task.focus).filter((entry) => entry.day === day);

      return {
        task,
        sessions: sessions.length,
        minutes: sessions.reduce((sum, entry) => sum + entry.minutes, 0),
      };
    })
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

// "1h 15m", "40m". Hours only appear once there is a whole one.
export function durationText(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);

  if (hours === 0) return `${rest}m`;

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Two soft notes when a phase ends. The timer is usually running in a tab
// nobody is looking at, so the end of a session has to be heard. Made with
// Web Audio rather than a sound file, so there is nothing to download, and
// silently skipped where audio is unavailable.
export function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    [660, 880].forEach((frequency, index) => {
      const at = ctx.currentTime + index * 0.25;
      const tone = ctx.createOscillator();
      const volume = ctx.createGain();

      tone.type = 'sine';
      tone.frequency.value = frequency;
      volume.gain.setValueAtTime(0.0001, at);
      volume.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
      tone.connect(volume).connect(ctx.destination);
      tone.start(at);
      tone.stop(at + 0.65);
    });

    setTimeout(() => ctx.close(), 1200);
  } catch {
    // No sound is better than a broken timer.
  }
}
