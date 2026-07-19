import React, { useState, useContext } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import TaskTable from '../components/data/TaskTable';
import { AppContext } from '../context/AppContext';

const Tasks = () => {
  const { addTask } = useContext(AppContext);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');

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
      <h1 className="text-3xl font-bold tracking-tight">Task Engine Operations</h1>
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