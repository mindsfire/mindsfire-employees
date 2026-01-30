import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout';

import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Don't show layout on login, logout, reset-password, or forgot-password-confirmation pages
  const isNoLayoutPage = ['/login', '/logout', '/reset-password', '/forgot-password-confirmation'].includes(router.pathname);

  return (
    <AuthProvider>
      <Head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </Head>
      {isNoLayoutPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </AuthProvider>
  );
}
