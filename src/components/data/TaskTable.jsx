import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Badge from '../ui/Badge';
import { Trash2 } from 'lucide-react';

const TaskTable = () => {
  const { tasks, updateTaskStatus, deleteTask } = useContext(AppContext);

  // Safely moved inside the component block
  const getBadgeVariant = (statusFlag) => {
    if (statusFlag === 'Completed') return 'success';
    if (statusFlag === 'In Progress') return 'warning';
    return 'danger';
  };

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
            <th className="p-4">Task Description</th>
            <th className="p-4">Target Date</th>
            <th className="p-4">Status Flag</th>
            <th className="p-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {tasks.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="p-4 font-medium max-w-xs truncate">{item.title}</td>
              <td className="p-4 font-mono text-slate-500">{item.date}</td>
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <select
                    value={item.status}
                    onChange={(e) => updateTaskStatus(item.id, e.target.value)}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium px-2 py-1 rounded-md focus:outline-none border border-slate-200 dark:border-slate-600 cursor-pointer text-xs"
                  >
                    <option value="Pending" className="bg-white dark:bg-slate-800">Pending</option>
                    <option value="In Progress" className="bg-white dark:bg-slate-800">In Progress</option>
                    <option value="Completed" className="bg-white dark:bg-slate-800">Completed</option>
                  </select>
                  <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
                </div>
              </td>
              <td className="p-4 text-right">
                <button 
                  onClick={() => deleteTask(item.id)} 
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;