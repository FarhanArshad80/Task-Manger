import React from 'react';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import AppRoutes from './routes/AppRoutes';
import UndoBar from './components/ui/UndoBar';

const App = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <AppRoutes />
        </main>
      </div>

      {/* Above the routes rather than inside the task page: a delete made on
          one screen should still be undoable after navigating away from it. */}
      <UndoBar />
    </div>
  );
};

export default App;