import React from "react";
const PageHeader = ({ title, subtitle, children }) => (
  <div className="max-w-3xl">
    <h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
    {subtitle && <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">{subtitle}</p>}
    {children && <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">{children}</div>}
  </div>
);
export default PageHeader;
