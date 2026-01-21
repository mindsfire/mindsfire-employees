import { ReactNode, useState } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../contexts/AuthContext';
import PasswordChangeDialog from './PasswordChangeDialog';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface LayoutProps {
    children: ReactNode;
    onLogoClick?: () => void;
}

export default function Layout({ children, onLogoClick }: LayoutProps) {
    const router = useRouter();
    const { user, changePassword, requiresPasswordChange } = useAuth();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const isDialogOpen = requiresPasswordChange || isPasswordDialogOpen;

    const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            setIsPasswordDialogOpen(false);
        }
        return result;
    };

    const handleLogout = () => {
        router.push('/logout');
    };

    const handleLogoClick = () => {
        if (onLogoClick) {
            onLogoClick();
            return;
        }
        router.push('/');
    };

    const breadcrumbs = router.pathname === '/admin'
        ? [
            { label: 'Dashboard', href: '/' },
            { label: 'User Management' },
        ]
        : [
            { label: 'Dashboard', href: '/' },
            { label: 'Attendance' },
        ];

    return (
        <SidebarProvider>
            <AppSidebar
                variant="inset"
                onLogout={handleLogout}
                onChangePassword={() => setIsPasswordDialogOpen(true)}
                onLogoClick={handleLogoClick}
            />
            <SidebarInset>
                <SiteHeader
                    breadcrumbs={breadcrumbs}
                    user={user ? { name: user.name, email: user.email } : null}
                    onLogout={handleLogout}
                    onChangePassword={() => setIsPasswordDialogOpen(true)}
                    onLogoClick={handleLogoClick}
                />
                <div className="flex flex-1 flex-col">
                    <div className="p-4 sm:p-6 lg:p-8">{children}</div>
                </div>
            </SidebarInset>

            <PasswordChangeDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    if (!requiresPasswordChange) {
                        setIsPasswordDialogOpen(false);
                    }
                }}
                onSubmit={handlePasswordChange}
                forceChange={requiresPasswordChange}
            />
        </SidebarProvider>
    );
}
