import React from 'react';

const Button = ({ children, onClick, variant = 'primary', type = 'button', className = '', disabled = false }) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none';
  // Hover classes are kept separate so a disabled button can simply drop
  // them, rather than relying on one background utility to out-specify
  // another in the generated stylesheet.
  const variants = {
    primary: 'bg-indigo-600 text-white',
    secondary: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-white',
    danger: 'bg-rose-600 text-white',
  };
  const hovers = {
    primary: 'hover:bg-indigo-700',
    secondary: 'hover:bg-slate-300 dark:hover:bg-slate-600',
    danger: 'hover:bg-rose-700',
  };
  const stateStyles = disabled ? 'opacity-50 cursor-not-allowed' : hovers[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${stateStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;