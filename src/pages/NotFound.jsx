import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import Card from '../components/ui/Card';
import { sidebarLinks } from '../config/sidebarNav';

// What a wrong address gets.
//
// There was no catch-all route, so anything that did not match one of the six
// paths matched nothing at all: the sidebar and the top bar drew as normal
// and the page beside them was empty. A mistyped URL, a stale bookmark or a
// link to a page that has since been renamed all produced a board that looked
// like it had failed to load rather than an address that does not exist.
const NotFound = () => {
  const { pathname } = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Page not found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {/* The address is quoted back. Half of these are a typo, and seeing
              which one arrived is what makes that obvious. */}
          Nothing lives at <span className="font-mono">{pathname}</span>.
        </p>
      </div>

      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Try one of these</h3>
            <p className="text-xs text-slate-400">
              Every page in the app, in case the one you wanted has moved.
            </p>
          </div>
          <Compass className="h-5 w-5 text-indigo-500" />
        </div>

        {/* Built from the same list the sidebar is, so a page added later
            turns up here without anybody remembering to add it twice. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sidebarLinks.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium transition-colors hover:border-indigo-500 hover:text-indigo-500"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the dashboard
        </Link>
      </Card>
    </div>
  );
};

export default NotFound;
