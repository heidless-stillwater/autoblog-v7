
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Image as ImageIcon,
    Settings as SettingsIcon,
    PlusCircle,
    LogOut,
    User,
    Sparkles,
    ExternalLink,
    Layers
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
    const { settings } = useStore();
    const { user, signOut } = useAuth();

    const navItems = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/admin/posts', icon: FileText, label: 'Posts', end: false },
        { to: '/admin/media', icon: ImageIcon, label: 'Media', end: false },
        { to: '/admin/articles', icon: FileText, label: 'Article Mgr', end: false },
        { to: '/admin/topics', icon: Sparkles, label: 'Topic Mgr', end: false },
        { to: '/admin/prompt-vault', icon: Layers, label: 'Prompt Vault', end: false },
    ];

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <aside className="w-64 h-screen fixed left-0 top-0 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">
                    {settings.siteTitle}
                </h1>
                <p className="text-sm text-slate-400 truncate mt-1">{settings.tagline}</p>
            </div>

            {/* User Profile Section */}
            {user && (
                <div className="px-4 pb-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full" />
                                ) : (
                                    <User size={20} className="text-white" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">
                                    {user.displayName || 'User'}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300',
                            isActive
                                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/50'
                        )}
                        end={item.end}
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}

                <div className="pt-6 mt-6 border-t border-slate-800">
                    <NavLink
                        to="/admin/posts/new"
                        className={({ isActive }) => clsx(
                            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group',
                            isActive
                                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20'
                                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50'
                        )}
                    >
                        <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-medium">New Post</span>
                    </NavLink>
                </div>
                <NavLink
                    to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <ExternalLink size={20} />
                    <span className="font-medium">View Site</span>
                </NavLink>
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-2">
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
                >
                    <SettingsIcon size={20} />
                    <span className="font-medium">Settings</span>
                </button>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
