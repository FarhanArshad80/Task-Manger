import React, { useContext, useMemo } from 'react';
import Card from '../components/ui/Card';
import ProgressChart from '../components/data/ProgressChart';
import { AppContext } from '../context/AppContext';
import { completionStreak } from '../utils/streak';
import { deliveryRate, onTimeRate, momentumRate } from '../utils/goals';
import { Target, TrendingUp, Award, Flame } from 'lucide-react';

// One card per measure. `read` returns null when there is nothing behind the
// figure yet, and `blank` is what to say instead — never a 0% bar, which
// reads as a failure where the honest answer is "nothing to go on".
const GOAL_CARDS = [
  {
    id: 'delivery',
    icon: Target,
    tone: 'text-indigo-500',
    bar: 'bg-indigo-500',
    title: 'Delivered',
    read: (tasks) => {
      const rate = deliveryRate(tasks);

      return rate && { pct: rate.pct, text: `${rate.done} of ${rate.total} tasks finished.` };
    },
    blank: 'Nothing on the board yet.',
  },
  {
    id: 'ontime',
    icon: Award,
    tone: 'text-emerald-500',
    bar: 'bg-emerald-500',
    title: 'On time',
    read: (tasks) => {
      const rate = onTimeRate(tasks);

      return (
        rate && {
          pct: rate.pct,
          text: `${rate.onTime} of ${rate.judged} finished on or before the deadline.`,
        }
      );
    },
    // Only tasks with both a deadline and a completion date can be judged,
    // and a board that does not use deadlines is not a board that is late.
    blank: 'No finished task has had a deadline to measure against.',
  },
  {
    id: 'momentum',
    icon: TrendingUp,
    tone: 'text-amber-500',
    bar: 'bg-amber-500',
    title: 'Momentum',
    read: (tasks) => {
      const rate = momentumRate(tasks);

      return (
        rate && {
          pct: rate.pct,
          text: `Something finished on ${rate.active} of the last ${rate.window} days.`,
        }
      );
    },
    blank: 'Finish a task to start measuring.',
  },
];

const Progress = () => {
  const { tasks } = useContext(AppContext);
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const streak = useMemo(() => completionStreak(tasks), [tasks]);
  const goals = useMemo(
    () => GOAL_CARDS.map((card) => ({ ...card, result: card.read(tasks) })),
    [tasks]
  );
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Milestones & Progress</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Granular breakdown of goal structures and habit completion rates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-bold">Task Delivery Progress</h2>
            <p className="text-xs text-slate-400 mb-4">Aggregated completion rates calculated from current state stores.</p>
          </div>
          <ProgressChart />
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Consistency Tracker</h2>
            <p className="text-xs text-slate-400 mb-4">Active performance streak indices.</p>
          </div>
          {/* The pulse is kept for a live run only. An animation on a zero
              draws the eye to the one number here that is not an
              achievement. */}
          <div className="flex items-center space-x-4 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
            <Flame
              className={`h-8 w-8 text-orange-500 ${streak.days > 0 ? 'animate-pulse' : 'opacity-40'}`}
            />
            <div>
              <p className="text-2xl font-black font-mono text-orange-500">
                {streak.days} {streak.days === 1 ? 'Day' : 'Days'}
              </p>
              <p className="text-xs text-slate-400">
                {streak.days === 0
                  ? streak.lastDay
                    ? `No run right now — last finished on ${streak.lastDay}`
                    : 'Finish a task to start a run'
                  : `Consecutive days finishing work · best ${streak.best}`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Goal Strategy Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {goals.map(({ id, icon: Icon, tone, bar, title, blank, result }) => (
          <Card key={id} className="space-y-2">
            <div className={tone}><Icon className="h-5 w-5" /></div>
            <div className="flex items-baseline justify-between">
              <h4 className="text-sm font-bold">{title}</h4>
              <span className="text-sm font-bold font-mono text-slate-400">
                {result ? `${result.pct}%` : '—'}
              </span>
            </div>
            <p className="text-xs text-slate-400">{result ? result.text : blank}</p>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2">
              {/* Width is inline because the percentage is a number, not one
                  of a fixed set of classes — Tailwind can only ship the ones
                  it can see in the source. */}
              <div
                className={`${bar} h-1.5 rounded-full transition-all duration-500`}
                style={{ width: `${result ? result.pct : 0}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Progress;