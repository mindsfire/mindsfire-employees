import { useState, ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
    children: ReactNode;
    onLogoClick?: () => void;
}

export default function Layout({ children, onLogoClick }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <Navbar onMenuClick={toggleSidebar} onLogoClick={onLogoClick} />

            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main Content */}
            <main className={`pt-16 transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
