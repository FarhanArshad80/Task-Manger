import React, { useContext } from 'react';
import Card from '../components/ui/Card';
import ProgressChart from '../components/data/ProgressChart';
import TaskTable from '../components/data/TaskTable';
import { AppContext } from '../context/AppContext';
import { CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';

const Dashboard = () => {
  const { tasks } = useContext(AppContext);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const active = tasks.filter(t => t.status === 'In Progress').length;
  const urgent = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Workspace Hub</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time operation metrics and core queue deployment status.</p>
      </div>

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
          <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
            <li className="p-2 rounded bg-slate-50 dark:bg-slate-700/50 border-l-2 border-indigo-500">⚡ Database links verified. Memory allocation performing efficiently.</li>
            <li className="p-2 rounded bg-slate-50 dark:bg-slate-700/50 border-l-2 border-amber-500">⚙️ Review the pending context middleware bugs before production staging.</li>
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