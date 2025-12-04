import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';

export default function Logout() {
    const { logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        logout();
    }, [logout]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
            </div>

            {/* Logo at top left */}
            <div className="absolute top-8 left-8 z-20">
                <Image
                    src="/mindsfire-logo.png"
                    alt="Mindsfire Logo"
                    width={140}
                    height={46}
                    className="object-contain"
                    priority
                />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden text-center p-8">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Logged Out
                    </h2>

                    <p className="text-gray-600 mb-8">
                        You have been successfully logged out of your account.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/login"
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] shadow-lg"
                        >
                            Return to Login
                        </Link>
                    </div>

                    <div className="mt-6 text-sm text-gray-500">
                        <p>Have a great day!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
