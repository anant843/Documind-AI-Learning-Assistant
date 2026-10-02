import React from 'react'

// Small progress indicator for short inline actions. Full pages use skeletons.
const Spinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };
  const dimension = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <span
        className={`animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400 ${dimension}`}
      />
    </span>
  );
};

export default Spinner
