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

export default function ResetPassword() {
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isReady, setIsReady] = useState(() => {
        if (typeof document === 'undefined') return false;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; password_recovery=`);
        if (parts.length === 2) {
            return parts.pop()?.split(';').shift() === 'true';
        }
        return false;
    });
    const [userEmail, setUserEmail] = useState('');

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

        // Check if we have the recovery cookie
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) {
                const cookieValue = parts.pop()?.split(';').shift();
                return cookieValue || '';
            }
            return '';
        };

        const isRecoveryFlow = getCookie('password_recovery') === 'true';
        console.log('[Reset Password] Recovery flow detected:', isRecoveryFlow);

        if (isRecoveryFlow && mounted) {
            console.log('[Reset Password] Recovery flow - proceeding without waiting for initial session');
            setIsReady(true);
        }

        // 1. First, check if we already have a session
        const initCheck = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
                console.log('[Reset Password] Initial session found:', session.user.email);
                setIsReady(true);
            } else if (isRecoveryFlow && mounted) {
                // If this is a recovery flow but no session yet, wait a bit longer
                console.log('[Reset Password] Recovery flow: waiting for session...');
            }
        };
        initCheck();

        // 2. Listen for auth state changes (especially important for recovery flows)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            console.log('[Reset Password] Auth event:', event);
            if (!mounted) return;

            if (session) {
                console.log('[Reset Password] Session detected via event:', session.user.email);
                setUserEmail(session.user.email || '');
                setIsReady(true);
            }

            if (event === 'PASSWORD_RECOVERY') {
                console.log('[Reset Password] Password recovery mode active');
                setIsReady(true);
            }
        });

        // 3. Fallback: if after 12 seconds we still aren't ready, and we aren't in success state, redirect
        const timeout = setTimeout(() => {
            if (!isReady && !isSuccess && mounted) {
                console.error('[Reset Password] No session found after timeout.');
                console.log('[Reset Password] Debug info:', {
                    isReady,
                    isSuccess,
                    isRecoveryFlow,
                    cookie: getCookie('password_recovery'),
                    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
                });
                if (isRecoveryFlow) {
                    router.replace('/login?error=Reset link expired. Please request a new password reset.');
                } else {
                    router.replace('/login?error=Invalid or expired reset link. Please try again.');
                }
            }
        }, 12000); // Increased timeout for slower connections on Vercel

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [supabase.auth, router, isReady, isSuccess]);

    const onSubmit = async (values: ResetPasswordFormValues) => {
        try {
            setError('');
            setIsLoading(true);

            // 1. Update Subapase Auth password
            const { data, error: updateError } = await supabase.auth.updateUser({
                password: values.password,
            });

            if (updateError) {
                throw updateError;
            }

            // 2. Update the password_changed flag in our employees table
            if (data?.user?.email) {
                const { error: dbError } = await supabase
                    .schema('attendance')
                    .from('employees')
                    .update({ password_changed: true })
                    .eq('email', data.user.email);

                if (dbError) {
                    console.error('Failed to update password_changed flag:', dbError);
                    // We don't block the user if this fails, as the auth password IS changed
                }
            }

            setIsSuccess(true);

            // Clean up the recovery cookie
            document.cookie = 'password_recovery=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            // Auto redirect after 3 seconds
            setTimeout(() => {
                router.push('/');
            }, 3000);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
            setError(errorMessage);
            console.error('Reset password error:', err);
        } finally {
            setIsLoading(false);
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
                                Your account has been updated with the new password. You will be redirected to your dashboard in a few seconds.
                            </p>
                        </div>
                        <Button className="w-full mt-2" onClick={() => router.push('/')}>
                            Go to Dashboard
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
