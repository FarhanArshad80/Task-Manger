import React, { useContext, useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { AppContext } from '../../context/AppContext';

// Long enough to notice the mistake and reach the button, short enough that
// the bar is not still sitting there when the next thing is being typed.
const WINDOW_MS = 8000;

const UndoBar = () => {
  const { recentlyDeleted, restoreDeleted, dismissDeleted } = useContext(AppContext);
  const [remaining, setRemaining] = useState(WINDOW_MS);

  const count = recentlyDeleted?.entries.length ?? 0;

  // The countdown restarts for each delete rather than continuing from
  // wherever the last one left off — otherwise a second delete would inherit
  // a window that is nearly closed.
  useEffect(() => {
    if (!recentlyDeleted) return undefined;

    setRemaining(WINDOW_MS);

    const started = Date.now();
    const tick = setInterval(() => {
      const left = WINDOW_MS - (Date.now() - started);

      if (left <= 0) {
        clearInterval(tick);
        dismissDeleted();
        return;
      }

      setRemaining(left);
    }, 100);

    return () => clearInterval(tick);
  }, [recentlyDeleted, dismissDeleted]);

  // Ctrl+Z (Cmd+Z on a Mac) is what anyone reaches for the instant they see
  // the wrong row vanish, before their eye has found the button. Only while
  // the offer is open, and never inside a text field, where the same keys
  // already undo typing and taking them over would lose a sentence.
  useEffect(() => {
    if (!recentlyDeleted) return undefined;

    const undoOnKey = (event) => {
      if (event.key.toLowerCase() !== 'z' || !(event.ctrlKey || event.metaKey)) return;
      if (event.shiftKey || event.altKey) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      restoreDeleted();
    };

    window.addEventListener('keydown', undoOnKey);
    return () => window.removeEventListener('keydown', undoOnKey);
  }, [recentlyDeleted, restoreDeleted]);

  if (!recentlyDeleted) return null;

  const label =
    count === 1
      ? `"${recentlyDeleted.entries[0].task.title}" deleted`
      : `${count} tasks deleted`;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        className="relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-xl dark:border-slate-600"
      >
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>

        <button
          type="button"
          onClick={restoreDeleted}
          title="Undo (Ctrl+Z)"
          aria-keyshortcuts="Control+Z Meta+Z"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/20"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>

        <button
          type="button"
          onClick={dismissDeleted}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* The window is visible rather than implied — a countdown you cannot
            see is indistinguishable from a bar that vanished on its own. */}
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-400 transition-[width] duration-100 ease-linear"
          style={{ width: `${(remaining / WINDOW_MS) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default UndoBar;
