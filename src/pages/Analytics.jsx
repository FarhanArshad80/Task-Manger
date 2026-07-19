import React, { useContext, useMemo } from 'react';
import Card from '../components/ui/Card';
import { Activity, PieChart, ShieldCheck, ListChecks } from 'lucide-react';
import { AppContext } from '../context/AppContext';

const STATUS_COLORS = {
  done: { bar: 'bg-emerald-500', text: 'text-emerald-500', dot: 'bg-emerald-500', hex: '#10b981' },
  completed: { bar: 'bg-emerald-500', text: 'text-emerald-500', dot: 'bg-emerald-500', hex: '#10b981' },
  'in progress': { bar: 'bg-amber-500', text: 'text-amber-500', dot: 'bg-amber-500', hex: '#f59e0b' },
  pending: { bar: 'bg-slate-400', text: 'text-slate-400', dot: 'bg-slate-400', hex: '#94a3b8' },
  default: { bar: 'bg-indigo-500', text: 'text-indigo-500', dot: 'bg-indigo-500', hex: '#6366f1' },
};

function getStatusStyle(status) {
  const key = (status || '').toLowerCase();
  return STATUS_COLORS[key] || STATUS_COLORS.default;
}

function isDoneStatus(status) {
  const key = (status || '').toLowerCase();
  return key === 'done' || key === 'completed';
}

function useAnalytics(tasks) {
  return useMemo(() => {
    const total = tasks.length;

    const statusCounts = {};
    tasks.forEach((t) => {
      const key = t.status || 'Unspecified';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });
    const statusBreakdown = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
        style: getStatusStyle(status),
      }))
      .sort((a, b) => b.count - a.count);

    const doneTasks = tasks.filter((t) => isDoneStatus(t.status));
    const successRate = total ? Math.round((doneTasks.length / total) * 100) : 0;

    const withDueDate = doneTasks.filter((t) => t.dueDate || t.deadline);
    const onTime = withDueDate.filter((t) => {
      const due = new Date(t.dueDate || t.deadline);
      const completed = t.completedAt ? new Date(t.completedAt) : null;
      return completed && completed <= due;
    });
    const accuracyPct = withDueDate.length
      ? Math.round((onTime.length / withDueDate.length) * 1000) / 10
      : null;

    return { total, statusBreakdown, successRate, doneCount: doneTasks.length, accuracyPct };
  }, [tasks]);
}

// Multi-segment donut chart built from raw SVG circles.
// Each status gets its own ring segment via stroke-dasharray/offset math.
const DonutChart = ({ segments, centerLabel, centerSubLabel, size = 200, strokeWidth = 22 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePct = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-100 dark:text-slate-800"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference;
          const gap = circumference - dash;
          const offset = -((cumulativePct / 100) * circumference);
          cumulativePct += seg.pct;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.style.hex}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-extrabold">{centerLabel}</span>
        <span className="text-xs text-slate-400 mt-0.5">{centerSubLabel}</span>
      </div>
    </div>
  );
};

const Analytics = () => {
  const { tasks = [] } = useContext(AppContext);
  const { total, statusBreakdown, successRate, doneCount, accuracyPct } = useAnalytics(tasks);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Analytics Engine</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Velocity graphs, tracking arrays, and execution metrics trends.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut chart card */}
        <Card className="lg:col-span-2 flex flex-col sm:flex-row items-center gap-8 justify-center py-8">
          <div>
            <h3 className="text-base font-bold mb-1">Task Completion Breakdown</h3>
            <p className="text-xs text-slate-400 mb-6">Live ratio of done, in-progress, and pending tasks.</p>

            {total === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-slate-400 max-w-xs">
                No tasks yet — add one from the Tasks page to see the breakdown here.
              </div>
            ) : (
              <DonutChart
                segments={statusBreakdown}
                centerLabel={`${successRate}%`}
                centerSubLabel={`${doneCount} of ${total} done`}
              />
            )}
          </div>

          {total > 0 && (
            <div className="space-y-3">
              {statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.style.hex }} />
                  <span className="font-medium">{s.status}</span>
                  <span className="text-slate-400">
                    — {s.count} ({s.pct}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Stat cards */}
        <div className="space-y-4">
          <Card className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Success Rate</h4>
              <p className="text-lg font-bold mt-0.5">{successRate}% Done</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {doneCount} of {total} total tasks completed
              </p>
            </div>
          </Card>

          <Card className="flex items-start space-x-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Task Distribution</h4>
              <p className="text-lg font-bold mt-0.5">{statusBreakdown.length} status types</p>
              <p className="text-[11px] text-slate-400 mt-0.5">See breakdown table below</p>
            </div>
          </Card>

          <Card className="flex items-start space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wide">Execution Integrity</h4>
              <p className="text-lg font-bold mt-0.5">
                {accuracyPct === null ? '—' : `${accuracyPct}%`} Accuracy Rate
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {accuracyPct === null
                  ? 'Needs completedAt + due date to calculate'
                  : 'Tasks completed on or before their due date'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Status ratio table (kept — matches your screenshot's table below) */}
      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Task Status Ratio</h3>
            <p className="text-xs text-slate-400">Pending vs. in-progress vs. done, across all tasks.</p>
          </div>
          <ListChecks className="h-5 w-5 text-indigo-500" />
        </div>

        {total === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No tasks yet — add one from the Tasks page to see the ratio here.
          </div>
        ) : (
          <>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {statusBreakdown.map((s) => (
                <div
                  key={s.status}
                  style={{ width: `${s.pct}%`, backgroundColor: s.style.hex }}
                  className="h-full"
                  title={`${s.status}: ${s.pct}%`}
                />
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Count</th>
                    <th className="py-2 pr-4 font-semibold">Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {statusBreakdown.map((s) => (
                    <tr key={s.status} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span className={`h-2 w-2 rounded-full ${s.style.dot}`} />
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{s.count}</td>
                      <td className={`py-2 pr-4 font-semibold ${s.style.text}`}>{s.pct}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4">{total}</td>
                    <td className="py-2 pr-4">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Analytics;