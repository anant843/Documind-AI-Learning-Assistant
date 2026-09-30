import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Bell, User, Menu } from 'lucide-react'

const Header = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const displayName = user?.username || user?.name || user?.email || 'User';
  const initial = displayName?.charAt(0)?.toUpperCase?.() || 'U';

  return (
    <header className="flex-shrink-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: mobile menu */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workspace</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3.5">
          <button 
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition" 
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
          </button>

          <div className="flex items-center gap-3 pl-2 border-l border-slate-200/80 dark:border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{displayName}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{user?.email || 'Student'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header