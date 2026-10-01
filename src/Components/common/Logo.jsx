import React from "react";

export const LogoIcon = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
    <rect x="4.5" y="3.5" width="23" height="25" rx="5" fill="#18202B" />
    <path d="M10 9.5h9.5M10 14h12M10 18.5h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M23.5 3.5v25" stroke="#60A5FA" strokeWidth="2" />
  </svg>
);

const Logo = ({ showSubtitle = true, iconOnly = false, className = "" }) => {
  if (iconOnly) return <LogoIcon className={className || "h-8 w-8"} />;
  return (
    <div className={"flex items-center gap-3 " + className}>
      <LogoIcon />
      <div className="min-w-0 leading-tight">
        <div className="text-sm font-bold tracking-[-0.02em] text-slate-950 dark:text-white">DocuMind</div>
        {showSubtitle && <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Study workspace</div>}
      </div>
    </div>
  );
};
export default Logo;
