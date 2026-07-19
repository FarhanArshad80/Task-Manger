import React from 'react';
import Card from '../components/ui/Card';
import {
  BookOpen, Terminal, Code2, Layers, LayoutGrid, CheckSquare,
  Calendar, BarChart3, TrendingUp, Sparkles, Quote, Zap
} from 'lucide-react';

const features = [
  {
    icon: LayoutGrid,
    color: 'indigo',
    title: 'Dashboard',
    desc: 'A single-glance overview of everything in motion — active workspaces, due items, and where your attention is needed most.',
  },
  {
    icon: CheckSquare,
    color: 'emerald',
    title: 'Tasks',
    desc: 'Create, prioritize, and complete work items. Every status change flows straight into the analytics engine in real time.',
  },
  {
    icon: Calendar,
    color: 'purple',
    title: 'Calendar',
    desc: 'See deadlines and scheduled work laid out across days and weeks, so nothing slips through unnoticed.',
  },
  {
    icon: BarChart3,
    color: 'rose',
    title: 'Progress',
    desc: 'Track completion rates and momentum over time, broken down by project and priority.',
  },
  {
    icon: TrendingUp,
    color: 'indigo',
    title: 'Analytics',
    desc: 'Weekly throughput, processing velocity, priority density, and execution accuracy — all computed live from your task data.',
  },
];

const quotes = [
  {
    text: "The dashboard changed how our team plans the week — everything just clicks into place.",
    author: 'Internal Beta Tester',
  },
  {
    text: "Finally a task tool that doesn't get in the way of actually doing the work.",
    author: 'Production Development Team',
  },
];

const colorMap = {
  indigo: 'bg-indigo-500/10 text-indigo-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  purple: 'bg-purple-500/10 text-purple-500',
  rose: 'bg-rose-500/10 text-rose-500',
};

const About = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-500 to-purple-600 p-8 text-white">
        <div className="absolute top-0 right-0 opacity-10">
          <Sparkles className="h-40 w-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-100 text-xs font-semibold uppercase tracking-wide">
            <Zap className="h-4 w-4" />
            <span>MicroGains Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Specification</h1>
          <p className="text-sm text-indigo-100 max-w-xl leading-relaxed">
            The architecture manual and design rules behind the Workspace dashboard —
            built to keep task management fast, transparent, and honest about real progress.
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <h2 className="text-lg font-bold mb-3">What's inside</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <Card key={title} className="space-y-3">
              <div className={`p-2 rounded-lg w-fit ${colorMap[color]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Quotes */}
      <div>
        <h2 className="text-lg font-bold mb-3">What people are saying</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quotes.map((q, i) => (
            <Card key={i} className="space-y-3">
              <Quote className="h-5 w-5 text-indigo-400" />
              <p className="text-sm italic text-slate-700 dark:text-slate-200 leading-relaxed">
                "{q.text}"
              </p>
              <p className="text-xs font-semibold text-slate-400">— {q.author}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div>
        <h2 className="text-lg font-bold mb-3">Tech stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 w-fit">
              <Code2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base">Core Framework</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Built as an isolated SPA using React 19, Vite, and React Router for fast,
              lightweight client-side navigation.
            </p>
          </Card>

          <Card className="space-y-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 w-fit">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base">Tailwind CSS v4 Stack</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Styled with the{' '}
              <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 text-rose-500 font-mono rounded">
                @tailwindcss/postcss
              </code>{' '}
              toolchain — native CSS variable compilation without heavy config layers.
            </p>
          </Card>
        </div>
      </div>

      {/* Operational directives */}
      <Card className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold">User Operational Directives</h2>
        </div>
        <div className="text-xs space-y-3 leading-relaxed text-slate-600 dark:text-slate-300">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">
              1. Context Binding Matrix
            </span>
            <p>
              Every operational node deployed within the "Task Engine Operations" view
              appends an entry directly into the top-level React Context state layer,
              signaling all dependent charts to adapt instantly.
            </p>
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">
              2. Dynamic Theme Transitions
            </span>
            <p>
              The top navigation container monitors context theme declarations to alter
              structural document class tags, forcing the application wrapper layouts to
              trigger immediate visual adjustments.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default About;