import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

type LoginFormValues = {
  employeeId: string;
  password: string;
  rememberMe: boolean;
};

export default function Login() {
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const router = useRouter();
  const { login } = useAuth();
  const lockoutDurationMs = 30 * 1000; // 30 seconds temporary lock

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<LoginFormValues>({
    defaultValues: {
      employeeId: '',
      password: '',
      rememberMe: false
    }
  });

  const isLockedOut = useMemo(() => {
    if (!lockoutUntil) return false;
    return lockoutUntil.getTime() > Date.now();
  }, [lockoutUntil]);

  useEffect(() => {
    const savedId = localStorage.getItem('rememberedEmployeeId');
    if (savedId) {
      setValue('employeeId', savedId);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  useEffect(() => {
    if (!lockoutUntil) return;
    const timer = setInterval(() => {
      if (lockoutUntil.getTime() <= Date.now()) {
        setLockoutUntil(null);
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const onSubmit = async (values: LoginFormValues) => {
    if (isLockedOut) {
      setAuthError('Too many failed attempts. Please wait a moment before trying again.');
      return;
    }

    try {
      setAuthError('');
      setIsLoading(true);
      const { success, error: loginError } = await login(values.employeeId, values.password);

      if (success) {
        if (values.rememberMe) {
          localStorage.setItem('rememberedEmployeeId', values.employeeId);
        } else {
          localStorage.removeItem('rememberedEmployeeId');
        }
        setFailedAttempts(0);
        setLockoutUntil(null);
        router.push('/');
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockoutUntil(new Date(Date.now() + lockoutDurationMs));
          setAuthError('Account temporarily locked due to multiple failed attempts. Please wait 30 seconds.');
        } else if (loginError) {
          setAuthError(loginError);
        } else {
          setAuthError('Invalid credentials. Please try again.');
        }
        reset({ employeeId: values.employeeId, password: '', rememberMe: values.rememberMe });
      }
    } catch (err) {
      setAuthError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const remainingLockSeconds = useMemo(() => {
    if (!isLockedOut || !lockoutUntil) return 0;
    return Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000);
  }, [isLockedOut, lockoutUntil]);

  const employeeIdValue = watch('employeeId');

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
        </div>
        
        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6">
              <div className="flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              </div>
              <h2 className="mt-4 text-center text-2xl font-bold text-white">
                Welcome Back
              </h2>
              <p className="mt-1 text-center text-blue-100 text-sm">
                Sign in to access your attendance dashboard
              </p>
            </div>

            {/* Form Content */}
            <div className="px-8 py-6 space-y-6">

              {/* Error Messages */}
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {authError}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {isLockedOut && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">
                        Login temporarily disabled for security. Try again in {remainingLockSeconds}s.
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label htmlFor="employeeId" className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <input
                      {...register('employeeId', {
                        required: 'Employee ID is required',
                        maxLength: {
                          value: 20,
                          message: 'Maximum 20 characters'
                        }
                      })}
                      id="employeeId"
                      type="text"
                      autoComplete="username"
                      disabled={isLoading || isLockedOut}
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm transition-all"
                      placeholder="Enter your employee ID"
                    />
                  </div>
                  {errors.employeeId ? (
                    <p className="mt-2 text-sm text-red-600">{errors.employeeId.message}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      Demo: admin, 1001, or 1002
                    </p>
                  )}
                </div>
          
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    </div>
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Minimum 6 characters'
                        }
                      })}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={isLoading || isLockedOut}
                      className="pl-10 pr-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 backdrop-blur-sm transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(prev => !prev)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      {...register('rememberMe')}
                      id="remember-me"
                      type="checkbox"
                      disabled={isLoading || isLockedOut}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading || isLockedOut}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Security Tips */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Security Tips
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>System auto-signs you out after 30 minutes of inactivity.</li>
                        <li>Never share your Employee ID or password.</li>
                        <li>Contact admin if you suspect unauthorized access.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Status */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Attempts remaining before lockout: {Math.max(0, 5 - failedAttempts)}
                </p>
                {employeeIdValue && (
                  <p className="mt-2 text-sm text-gray-600">
                    Signing in as <strong>{employeeIdValue}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
