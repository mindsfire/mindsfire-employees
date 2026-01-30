import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type ResetPasswordFormValues = {
    password: string;
    confirmPassword: string;
};

type DebugInfo = {
    hasSession: boolean;
    hasCookie: boolean;
    email?: string;
    url: string;
    cookies: string[];
    error?: string;
} | null;

export default function ResetPassword() {
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [debugInfo, setDebugInfo] = useState<DebugInfo>(null);

    const router = useRouter();
    const supabase = createClient();

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch
    } = useForm<ResetPasswordFormValues>({
        defaultValues: {
            password: '',
            confirmPassword: '',
        }
    });

    const passwordValue = watch('password');

    useEffect(() => {
        let mounted = true;

        const getCookie = (name: string) => {
            try {
                const cookies = document.cookie.split(';').map(c => c.trim());
                for (const cookie of cookies) {
                    if (cookie.startsWith(`${name}=`)) {
                        return cookie.substring(name.length + 1);
                    }
                }
                return '';
            } catch (e) {
                return '';
            }
        };

        const checkRecoveryStatus = async () => {
            console.log('[Reset Password] Checking recovery status...');

            // 1. Check for recovery cookie
            const hasRecoveryCookie = getCookie('password_recovery') === 'true';

            // 2. Check for active session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            const info = {
                hasSession: !!session,
                hasCookie: hasRecoveryCookie,
                email: session?.user?.email,
                url: typeof window !== 'undefined' ? window.location.href : '',
                cookies: typeof document !== 'undefined' ? document.cookie.split(';').map(c => c.split('=')[0].trim()) : [],
                error: sessionError?.message
            };

            console.log('[Reset Password] Status check:', info);
            if (mounted) setDebugInfo(info);

            if (!mounted) return;

            if (session) {
                setUserEmail(session.user.email || '');
                setIsReady(true);
            } else if (hasRecoveryCookie) {
                setIsReady(true);
            }
        };

        checkRecoveryStatus();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            if (!mounted) return;
            console.log('[Reset Password] Auth State Change:', event, !!session);

            if (session) {
                setUserEmail(session.user.email || '');
                setIsReady(true);
            }
            if (event === 'PASSWORD_RECOVERY') {
                setIsReady(true);
            }
        });

        // Fallback: if after 8 seconds
        const timeout = setTimeout(() => {
            if (!isReady && !isSuccess && mounted) {
                console.error('[Reset Password] Not ready after timeout. Manual check info:', debugInfo);
                const hasCookie = getCookie('password_recovery') === 'true';
                if (hasCookie || (typeof window !== 'undefined' && window.location.hash.includes('access_token'))) {
                    console.log('[Reset Password] Potential session found, forcing form display.');
                    setIsReady(true);
                }
            }
        }, 8000);

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [supabase.auth, router, isSuccess]);

    const onSubmit = async (values: ResetPasswordFormValues) => {
        try {
            console.log('[Reset Password] Submit button clicked. Values present:', !!values.password);
            setError('');
            setIsLoading(true);

            // 1. Update Supabase Auth password
            console.log('[Reset Password] Calling supabase.auth.updateUser...');
            const { data, error: updateError } = await supabase.auth.updateUser({
                password: values.password,
            });

            if (updateError) {
                console.error('[Reset Password] Supabase update error:', updateError);
                throw updateError;
            }

            console.log('[Reset Password] Auth update successful. User email:', data?.user?.email);
            console.log('[Reset Password] Setting success state to TRUE');

            // SUCCESS! Set this immediately so the UI changes
            setIsSuccess(true);
            setIsLoading(false);

            console.log('[Reset Password] Success state has been set. isSuccess should now be true.');

            // 2. Update the password_changed flag in our employees table (Background Task)
            if (data?.user?.email) {
                console.log('[Reset Password] Triggering background DB update...');
                supabase
                    .schema('attendance')
                    .from('employees')
                    .update({ password_changed: true })
                    .eq('email', data.user.email)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .then(({ error: dbError }: { error: any }) => {
                        if (dbError) {
                            console.error('[Reset Password] Background DB Update error:', dbError);
                        } else {
                            console.log('[Reset Password] Background DB Update successful');
                        }
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .catch((err: any) => {
                        console.error('[Reset Password] Background DB Exception:', err);
                    });
            }

            // Clean up the recovery cookie
            document.cookie = 'password_recovery=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            // Redirect after 5 seconds to give user time to read
            console.log('[Reset Password] Redirect scheduled in 5 seconds.');
            setTimeout(() => {
                console.log('[Reset Password] Redirecting to logout...');
                router.push('/logout');
            }, 5000);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
            setError(errorMessage);
            setIsLoading(false);
            console.error('[Reset Password] Submit process caught an error:', err);
        }
    };

    if (!isReady && !isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Preparing your password reset...</p>
                </div>
            </div>
        );
    }

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
                    <h1 className="text-2xl font-bold tracking-tight">Change Password</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your new password below to reset your account access.
                    </p>
                </div>

                {isSuccess ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-emerald-100 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">Password Changed Successfully</h3>
                            <p className="text-sm text-muted-foreground">
                                Your account has been updated with the new password. You will now be logged out and asked to log in again.
                            </p>
                        </div>
                        <Button className="w-full mt-2" onClick={() => router.push('/logout')}>
                            Log In with New Password
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <FieldGroup>
                            {error && (
                                <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md mb-2">
                                    {error}
                                </div>
                            )}

                            <Field>
                                <FieldLabel htmlFor="password">Change Password</FieldLabel>
                                <div className="relative">
                                    <Input
                                        {...register('password', {
                                            required: 'Please enter a password',
                                            minLength: {
                                                value: 6,
                                                message: 'Password must be at least 6 characters',
                                            },
                                        })}
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter new password"
                                        disabled={isLoading}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                                {errors.password?.message && (
                                    <FieldDescription className="text-destructive">
                                        {errors.password.message}
                                    </FieldDescription>
                                )}
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="confirmPassword">New Password</FieldLabel>
                                <Input
                                    {...register('confirmPassword', {
                                        required: 'Please confirm the password',
                                        validate: (val: string) => {
                                            if (val !== passwordValue) {
                                                return "Passwords do not match";
                                            }
                                        },
                                    })}
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm new password"
                                    disabled={isLoading}
                                />
                                {errors.confirmPassword?.message && (
                                    <FieldDescription className="text-destructive">
                                        {errors.confirmPassword.message}
                                    </FieldDescription>
                                )}
                            </Field>

                            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset Password'}
                            </Button>

                            <Button
                                variant="ghost"
                                type="button"
                                className="w-full text-muted-foreground"
                                onClick={() => router.push('/login')}
                                disabled={isLoading}
                            >
                                Back to Login
                            </Button>
                        </FieldGroup>
                    </form>
                )}

                <p className="px-6 text-center text-xs text-muted-foreground">
                    © 2026 Mindsfire Pvt Ltd, All Rights Reserved.
                </p>
            </div>
        </div>
    );
}
