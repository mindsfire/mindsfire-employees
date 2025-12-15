import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { AttendanceProvider } from '../context/AttendanceContext';

export default function App({ Component, pageProps }: AppProps) {
    return (
        <AuthProvider>
            <AttendanceProvider>
                <Component {...pageProps} />
            </AttendanceProvider>
        </AuthProvider>
    );
}
