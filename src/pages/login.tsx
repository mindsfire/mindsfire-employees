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
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eef2ff, #e3f2fd)'
    }}>
      <div style={{ 
        width: '100%',
        maxWidth: '420px', 
        margin: '40px auto', 
        padding: '32px',
        border: '1px solid #dfe3eb',
        borderRadius: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>👤</div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#1f2937' }}>Employee Login</h1>
          <p style={{ color: '#6b7280', margin: '8px 0 0' }}>Secure access to your attendance dashboard</p>
        </div>

        {authError && (
          <div style={{ 
            color: '#b91c1c', 
            margin: '10px 0 20px', 
            padding: '12px', 
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            {authError}
          </div>
        )}

        {isLockedOut && (
          <div style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '16px',
            color: '#c2410c'
          }}>
            Login temporarily disabled for security. Try again in {remainingLockSeconds}s.
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>Employee ID</label>
            <input
              type="text"
              placeholder="e.g. 1205"
              {...register('employeeId', {
                required: 'Employee ID is required',
                pattern: {
                  value: /^\d+$/,
                  message: 'Must contain only digits'
                },
                minLength: {
                  value: 4,
                  message: 'Minimum 4 digits'
                },
                maxLength: {
                  value: 10,
                  message: 'Maximum 10 digits'
                }
              })}
              disabled={isLoading || isLockedOut}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.employeeId ? '#fca5a5' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            {errors.employeeId && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '6px' }}>{errors.employeeId.message}</p>
            )}
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Minimum 6 characters'
                  }
                })}
                disabled={isLoading || isLockedOut}
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 12px',
                  border: `1px solid ${errors.password ? '#fca5a5' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  lineHeight: 0
                }}
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6.708 6.708C4.585 8.295 3.108 10.302 2.25 12c1.5 4 5.25 6.75 9.75 6.75 1.201 0 2.347-.19 3.424-.535" />
                    <path d="M20.983 15.299c.445-.54.827-1.093 1.067-1.549-1.5-4-5.25-6.75-9.75-6.75-.837 0-1.65.102-2.43.296" />
                    <path d="M14.121 14.121a3 3 0 0 1-4.242-4.242" />
                    <path d="M3 3l18 18" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.25 12s3.75-6.75 9.75-6.75 9.75 6.75 9.75 6.75-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '6px' }}>{errors.password.message}</p>
            )}
            <p style={{ marginTop: '6px', color: '#6b7280', fontSize: '0.85rem' }}>Use a strong password you do not share with others.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151' }}>
              <input
                type="checkbox"
                {...register('rememberMe')}
                disabled={isLoading || isLockedOut}
              />
              Remember me on this device
            </label>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || isLockedOut}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || isLockedOut ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              opacity: isLoading || isLockedOut ? 0.7 : 1,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in securely'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          padding: '12px',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e3a8a',
          fontSize: '0.9rem'
        }}>
          <strong>Security tips:</strong>
          <ul style={{ paddingLeft: '18px', margin: '8px 0 0' }}>
            <li>System auto-signs you out after 30 minutes of inactivity.</li>
            <li>Never share your Employee ID or password.</li>
            <li>Contact admin if you suspect unauthorized access.</li>
          </ul>
        </div>

        <p style={{
          marginTop: '16px',
          fontSize: '0.85rem',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          Attempts remaining before lockout: {Math.max(0, 5 - failedAttempts)}
        </p>

        {employeeIdValue && (
          <p style={{
            marginTop: '8px',
            fontSize: '0.8rem',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Signing in as <strong>{employeeIdValue}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
