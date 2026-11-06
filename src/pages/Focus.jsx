import Card from '../components/ui/Card';

// A timer for working on one task at a time, with the minutes written back
// onto the task when a session ends.
const Focus = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Focus</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pick a task, start the timer, and the time is saved on the task when the session ends.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-6 py-10" />
    </div>
  );
};

export default Focus;
