import React, { useContext, useMemo } from 'react';
import Card from '../components/ui/Card';
import ProgressChart from '../components/data/ProgressChart';
import TaskTable from '../components/data/TaskTable';
import { AppContext } from '../context/AppContext';
import { buildBriefing } from '../utils/briefing';
import { todayKey } from '../utils/streak';
import { CheckCircle2, Clock, AlertCircle, Zap, Pin } from 'lucide-react';

// Each note is coloured by what it is asking for rather than by where it
// happens to sit in the list, so a board with nothing late never shows a red
// stripe and a run of good days never shows an amber one.
const NOTE_TONES = {
  late: { bar: 'border-rose-500', mark: '⏰' },
  now: { bar: 'border-amber-500', mark: '⚙️' },
  ahead: { bar: 'border-indigo-500', mark: '📋' },
  good: { bar: 'border-emerald-500', mark: '✅' },
};

const Dashboard = () => {
  const { tasks, updateTaskStatus } = useContext(AppContext);
  const today = todayKey();

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const active = tasks.filter(t => t.status === 'In Progress').length;
  const urgent = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;
  const notes = useMemo(() => buildBriefing(tasks), [tasks]);
  // Pinning says "this one, today". The table honours that by floating
  // pinned rows to the top — but the dashboard is the page people actually
  // open, and it had no idea any of it had been decided. Finding today's two
  // or three jobs meant going to the table and scrolling to it.
  const pinned = useMemo(
    () => tasks.filter((task) => task.pinned && task.status !== 'Completed'),
    [tasks]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Workspace Hub</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time operation metrics and core queue deployment status.</p>
      </div>

      {/* Above the metrics, because it is the answer and they are the
          context. A board that has been given a focus should lead with it. */}
      {pinned.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Today's focus</h3>
              <p className="text-xs text-slate-400">
                The {pinned.length === 1 ? 'task' : `${pinned.length} tasks`} you pinned.
              </p>
            </div>
            <Pin className="h-5 w-5 text-amber-500" />
          </div>

          <ul className="space-y-2">
            {pinned.map((task) => {
              const late = task.deadline && task.deadline < today && task.status !== 'Completed';

              return (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 border-l-2 border-l-amber-500 px-3 py-2"
                >
                  {/* One press to close it out. The whole point of a pin is
                      that this is the work in hand, so the action it most
                      needs is the one that finishes it. */}
                  <button
                    type="button"
                    onClick={() => updateTaskStatus(task.id, 'Completed')}
                    aria-label={`Mark "${task.title}" completed`}
                    title="Mark completed"
                    className="shrink-0 text-slate-300 dark:text-slate-600 transition-colors hover:text-emerald-500"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>

                  {/* Only when it is late. A due date on every row would be a
                      column; a date on the one that has slipped is a warning. */}
                  {late && (
                    <span className="shrink-0 font-mono text-xs font-semibold text-rose-500">
                      overdue
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500"><Zap className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Actions</p>
            <p className="text-2xl font-bold font-mono mt-0.5">{total}</p>
          </div>
        </Card>
        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold font-mono mt-0.5 text-emerald-500">{completed}</p>
          </div>
        </Card>
        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500"><Clock className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Run</p>
            <p className="text-2xl font-bold font-mono mt-0.5 text-amber-500">{active}</p>
          </div>
        </Card>
        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-500"><AlertCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Urgent Gates</p>
            <p className="text-2xl font-bold font-mono mt-0.5 text-rose-500">{urgent}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold mb-1">Queue Saturation</h3>
            <p className="text-xs text-slate-400 mb-4">Functional analysis of active state allocations.</p>
          </div>
          <ProgressChart />
        </Card>

        <Card>
          <h3 className="text-base font-bold mb-2">Quick System Notes</h3>
          <p className="text-xs text-slate-400 mb-3">What the queue says right now.</p>
          <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
            {notes.map((note) => {
              const tone = NOTE_TONES[note.tone] || NOTE_TONES.ahead;

              return (
                <li
                  key={note.id}
                  className={`p-2 rounded bg-slate-50 dark:bg-slate-700/50 border-l-2 ${tone.bar}`}
                >
                  {tone.mark} {note.text}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold">Primary Execution Matrix</h2>
          <p className="text-xs text-slate-400">Inline status updates map immediately to global variables.</p>
        </div>
        <TaskTable />
      </Card>
    </div>
  );
};

export default Dashboard;