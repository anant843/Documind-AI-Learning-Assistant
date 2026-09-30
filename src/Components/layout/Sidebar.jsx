import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, FileText, History, User, LogOut, BookOpen, Layers, Briefcase, X, Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import Logo from '../common/Logo'

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
    const { logout } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/documents', label: 'Documents', icon: FileText },
        { to: '/history', label: 'History', icon: History },
        { to: '/multi-chat', label: 'Multi-Doc Chat', icon: Layers },
        { to: '/interview', label: 'AI Interview', icon: Briefcase },
        { to: '/flashcards', label: 'Flashcards', icon: BookOpen },
        { to: '/profile', label: 'Profile', icon: User },
    ];

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={toggleSidebar}
                aria-hidden="true"
            />

            {/* Sidebar panel */}
            <aside
                className={`fixed z-50 inset-y-0 left-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-slate-950/50 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80">
                        <Logo showSubtitle={true} />
                        <button 
                            onClick={toggleSidebar} 
                            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition" 
                            aria-label="Close sidebar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="px-3.5 py-4 space-y-1.5 flex-1 overflow-y-auto">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 ${
                                        isActive
                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30 shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                    }`
                                }
                                onClick={toggleSidebar}
                            >
                                <link.icon className="h-4.5 w-4.5 shrink-0" />
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="mt-auto px-3.5 pb-4 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition"
                            title="Toggle Dark / Light Mode"
                        >
                            <div className="flex items-center gap-3">
                                {isDark ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-500" />}
                                <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                {isDark ? 'Dark' : 'Light'}
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full inline-flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition"
                        >
                            <LogOut className="h-4.5 w-4.5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar