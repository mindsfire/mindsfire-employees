import { useRouter } from 'next/router';
import Image from 'next/image';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ForgotPasswordConfirmation() {
    const router = useRouter();
    const { email } = router.query;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50/50">
            <div className={cn('flex w-full max-w-sm flex-col gap-6')}>
                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center justify-center rounded-md -mt-8">
                        <Image
                            src="/logo-only.svg"
                            alt="Mindsfire"
                            width={56}
                            height={56}
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in duration-300">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                        <p className="text-sm text-muted-foreground">
                            We&apos;ve sent a password reset link to {email ? <span className="font-semibold text-foreground">{email}</span> : 'your email address'}.
                        </p>
                    </div>

                    <div className="w-full space-y-3 pt-2">
                        <p className="text-xs text-muted-foreground">
                            Didn&apos;t receive the email? Check your spam folder or try requesting another link.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => router.push('/login')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Login
                        </Button>
                    </div>
                </div>

                <p className="px-6 text-center text-xs text-muted-foreground">
                    © 2026 Mindsfire Pvt Ltd, All Rights Reserved.
                </p>
            </div>
        </div>
    );
}
