import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // If it's an authentication-related error, redirect to login
    if (error.message.includes('useAuth') || error.message.includes('AuthProvider')) {
      window.location.href = '/login';
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: '#d32f2f', marginBottom: '16px' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              An unexpected error occurred. This has been logged and we'll work to fix it.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4a7ed4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Go to Login
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#666' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
