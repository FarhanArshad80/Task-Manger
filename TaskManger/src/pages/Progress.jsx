import React, { useContext } from 'react';
import Card from '../components/ui/Card';
import ProgressChart from '../components/data/ProgressChart';
import { AppContext } from '../context/AppContext';
import { Target, TrendingUp, Award, Flame } from 'lucide-react';

const Progress = () => {
  const { tasks } = useContext(AppContext);
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  
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
          <div className="flex items-center space-x-4 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
            <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
            <div>
              <p className="text-2xl font-black font-mono text-orange-500">12 Days</p>
              <p className="text-xs text-slate-400">MicroGains Execution Habit Streak</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Goal Strategy Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="space-y-2">
          <div className="text-indigo-500"><Target className="h-5 w-5" /></div>
          <h4 className="text-sm font-bold">Daily Objectives</h4>
          <p className="text-xs text-slate-400">Maintain over 80% delivery across scheduled tasks.</p>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2">
            <div className="bg-indigo-500 h-1.5 rounded-full w-[85%]"></div>
          </div>
        </Card>
        <Card className="space-y-2">
          <div className="text-amber-500"><TrendingUp className="h-5 w-5" /></div>
          <h4 className="text-sm font-bold">Velocity Threshold</h4>
          <p className="text-xs text-slate-400">Calculate cycle speed from initialization to completion flags.</p>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2">
            <div className="bg-amber-500 h-1.5 rounded-full w-[70%]"></div>
          </div>
        </Card>
        <Card className="space-y-2">
          <div className="text-emerald-500"><Award className="h-5 w-5" /></div>
          <h4 className="text-sm font-bold">Quality Standard</h4>
          <p className="text-xs text-slate-400">Zero critical rollbacks over running components.</p>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2">
            <div className="bg-emerald-500 h-1.5 rounded-full w-[95%]"></div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Progress;