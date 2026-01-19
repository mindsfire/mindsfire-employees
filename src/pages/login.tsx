import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Controller, useForm } from 'react-hook-form';
import Image from 'next/image';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export default function Login() {
  const [authError, setAuthError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setValue('email', savedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setAuthError('');
      setResetMessage('');
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (!error) {
        if (values.rememberMe) {
          localStorage.setItem('rememberedEmail', values.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        router.push('/');
      } else {
        console.log(error);
        setAuthError(error.message || 'Invalid credentials. Please try again.');
        // Don't reset email, just password
        setValue('password', '');
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = async () => {
    const email = (emailValue || '').trim();

    if (!email) {
      setAuthError('Please enter your email first so we can send a reset link.');
      return;
    }

    try {
      setAuthError('');
      setResetMessage('');
      setIsResetting(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        console.log(error);
        setAuthError(error.message || 'Unable to send reset email. Please try again.');
        return;
      }

      setResetMessage('If an account exists for this email, a password reset link has been sent.');
    } catch (err) {
      console.error('Forgot password error:', err);
      setAuthError('Unable to send reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const emailValue = watch('email');

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className={cn('flex w-full max-w-sm flex-col gap-6')}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="#"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex items-center justify-center rounded-md -mt-8">
                  <Image
                    src="/logo-only.svg"
                    alt="Mindsfire"
                    width={45}
                    height={45}
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="sr-only">Mindsfire</span>
              </a>
              <h1 className="text-xl font-bold">Welcome to Mindsfire Employees</h1>
            </div>

            {/* Error Messages */}
            {authError && (
              <FieldDescription className="text-destructive">{authError}</FieldDescription>
            )}

            {resetMessage && (
              <FieldDescription className="text-primary">{resetMessage}</FieldDescription>
            )}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                id="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                disabled={isLoading}
              />
              {errors.email?.message && (
                <FieldDescription className="text-destructive">
                  {errors.email.message}
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Minimum 6 characters',
                    },
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <Field orientation="horizontal" className="items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="rememberMe"
                  render={({ field }) => (
                    <Checkbox
                      id="remember-me"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      disabled={isLoading}
                    />
                  )}
                />
                <FieldLabel htmlFor="remember-me">Remember me</FieldLabel>
              </div>

              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-muted-foreground hover:text-foreground"
                disabled={isLoading || isResetting}
                onClick={onForgotPassword}
              >
                {isResetting ? 'Sending reset link…' : 'Forgot password?'}
              </Button>
            </Field>

            <Field>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Login'}
              </Button>
            </Field>

            <FieldSeparator>Or</FieldSeparator>

            <Field>
              <Button variant="outline" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Continue with Google
              </Button>
            </Field>
          </FieldGroup>
        </form>

        <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
          © 2026 Mindsfire Pvt Ltd, All Rights Reserved.
        </FieldDescription>
      </div>
    </div>
  );
}
