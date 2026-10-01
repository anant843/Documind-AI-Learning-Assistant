import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Menu, Bell } from "lucide-react";

const Header = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const displayName = user?.username || user?.name || user?.email || "Student";
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <header className="z-30 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-[#181b21] sm:px-6">
      <button onClick={toggleSidebar} className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Study workspace</p>
        <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">Read, retrieve, and review from your own material.</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white dark:bg-blue-600">{initial}</div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-40 truncate text-xs font-semibold text-slate-900 dark:text-white">{displayName}</p>
            <p className="max-w-40 truncate text-[11px] text-slate-500 dark:text-slate-400">{user?.email || "Signed in"}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
