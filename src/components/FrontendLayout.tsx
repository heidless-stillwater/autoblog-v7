import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store';
import { LayoutDashboard, LogIn, Search, Facebook, Twitter, Instagram } from 'lucide-react';

const FrontendLayout = () => {
    const { user } = useAuth();
    const { settings } = useStore();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex flex-col">
                            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                                {settings.siteTitle || 'AutoBlog'}
                            </Link>
                            {settings.tagline && (
                                <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                                    {settings.tagline}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            <button className="text-slate-400 hover:text-white transition-colors">
                                <Search size={20} />
                            </button>

                            {user ? (
                                <Link
                                    to="/admin"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-indigo-500/20"
                                >
                                    <LayoutDashboard size={16} />
                                    <span>Dashboard</span>
                                </Link>
                            ) : (
                                <Link
                                    to="/login"
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all font-medium text-sm border border-slate-700"
                                >
                                    <LogIn size={16} />
                                    <span>Login</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Outlet />
            </main>

            <footer className="border-t border-white/5 bg-slate-950 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-center md:text-left">
                            <h3 className="text-lg font-bold text-white mb-2">{settings.siteTitle || 'AutoBlog'}</h3>
                            <p className="text-slate-500 text-sm">
                                &copy; {new Date().getFullYear()} All rights reserved.
                            </p>
                        </div>

                        <div className="flex gap-6">
                            <a href="#" className="text-slate-500 hover:text-indigo-400 transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="text-slate-500 hover:text-indigo-400 transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-slate-500 hover:text-indigo-400 transition-colors"><Instagram size={20} /></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FrontendLayout;
