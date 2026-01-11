
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';


interface LayoutProps {
    children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    // We'll implement the actual modal visibility logic next.
    // For now, we can structure the layout.

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen scroll-smooth">
                <div className="max-w-6xl mx-auto animate-fade-in">
                    {children || <Outlet />}
                </div>
            </main>

            <SettingsModal />
        </div>
    );
};

export default Layout;
