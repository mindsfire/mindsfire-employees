import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
    onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    const { user, logout } = useAuth();

    // Get user initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <nav className="bg-indigo-600 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left side - Menu button and Logo */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onMenuClick}
                            className="p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-8 w-8"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <h1 className="text-xl font-bold hidden sm:block">Attendance Logger</h1>
                        </div>
                    </div>

                    {/* Right side - User info and Sign out */}
                    {user && (
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-3">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 font-semibold text-sm">
                                    {getInitials(user.name)}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-indigo-200">{user.role}</p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
