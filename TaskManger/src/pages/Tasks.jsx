import React, { useState, useContext, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import TaskTable from '../components/data/TaskTable';
import { AppContext } from '../context/AppContext';

const Tasks = () => {
  const { tasks, addTask } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

  const summary = useMemo(() => {
    const count = (status) => tasks.filter((task) => task.status === status).length;

    return [
      { label: 'Pending', value: count('Pending'), dot: 'bg-rose-500' },
      { label: 'In Progress', value: count('In Progress'), dot: 'bg-amber-500' },
      { label: 'Completed', value: count('Completed'), dot: 'bg-emerald-500' },
    ];
  }, [tasks]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title,
      status: 'Pending',
      priority: 'Medium',
      date: new Date().toISOString().split('T')[0], // created date
      deadline: deadline || null,                    // due date, shown on Calendar
    });
    setTitle('');
    setDeadline('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Task Engine Operations</h1>

        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          {summary.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{item.value}</span>
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Initialize a new objective..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <Button type="submit">Deploy Task</Button>
        </form>
      </Card>
      <Card>
        <TaskTable />
      </Card>
    </div>
  );
};

export default Tasks;