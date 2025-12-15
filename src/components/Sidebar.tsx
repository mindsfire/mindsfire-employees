import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user } = useAuth();
    const router = useRouter();

    const links = [
        { label: 'Dashboard', href: '/' },
        ...(user?.role === 'admin' ? [{ label: 'Admin Panel', href: '/admin' }] : []),
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Container */}
            <aside
                className={`fixed top-16 left-0 bottom-0 w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col py-4">
                    <div className="px-4 mb-6">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Menu
                        </p>
                    </div>

                    <nav className="flex-1 px-2 space-y-1">
                        {links.map((link) => {
                            const isActive = router.pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => {
                                        // Close sidebar on mobile when link is clicked
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
