import React from 'react';

const Badge = ({ variant = 'default', children }) => {
  const base = 'px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide inline-flex items-center';
  const designs = {
    default: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400',
  };

  return <span className={`${base} ${designs[variant]}`}>{children}</span>;
};

export default Badge;