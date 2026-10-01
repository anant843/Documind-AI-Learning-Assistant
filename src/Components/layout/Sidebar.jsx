import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, History, User, LogOut, BookOpen, Layers, Briefcase, X, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Logo from "../common/Logo";

const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/documents", "Library", FileText],
  ["/multi-chat", "Ask across files", Layers],
  ["/flashcards", "Flashcards", BookOpen],
  ["/interview", "Practice interview", Briefcase],
  ["/history", "History", History],
  ["/profile", "Account", User],
];

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const { logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const signOut = () => { logout(); navigate("/login"); };
  return <>
    <button aria-label="Close navigation" onClick={toggleSidebar} className={`fixed inset-0 z-40 bg-slate-950/35 transition md:hidden ${isSidebarOpen ? "block" : "hidden"}`} />
    <aside className={`fixed inset-y-0 left-0 z-50 w-60 border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-[#181b21] md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <Logo />
          <button onClick={toggleSidebar} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800" aria-label="Close navigation"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-xs font-semibold text-slate-400">Workspace</p>
          <div className="space-y-1">
            {links.map(([to,label,Icon]) => <NavLink key={to} to={to} onClick={() => isSidebarOpen && toggleSidebar()} className={({isActive}) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${isActive ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}><Icon className="h-4 w-4" /><span>{label}</span></NavLink>)}
          </div>
        </nav>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button onClick={toggleTheme} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}<span>{isDark ? "Light mode" : "Dark mode"}</span></button>
          <button onClick={signOut} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"><LogOut className="h-4 w-4" /><span>Sign out</span></button>
        </div>
      </div>
    </aside>
  </>;
};
export default Sidebar;
