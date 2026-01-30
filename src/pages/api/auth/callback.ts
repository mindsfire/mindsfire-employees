import { createServerClient, serializeCookieHeader } from '@supabase/ssr'
import { type NextApiRequest, type NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('[Auth Callback] Full URL:', req.url);
    console.log('[Auth Callback] Query params:', req.query);
    console.log('[Auth Callback] Headers:', Object.keys(req.headers));

    const code = req.query.code
    let next = req.query.next as string || '/'
    const error = req.query.error as string
    const type = req.query.type as string

    // Force redirection to reset-password if we detect a recovery flow
    if (type === 'recovery' && next === '/') {
        next = '/reset-password'
    }

    console.log('[Auth Callback] Code present:', !!code)
    console.log('[Auth Callback] Code value:', code)
    console.log('[Auth Callback] Next path:', next)
    console.log('[Auth Callback] Error present:', !!error)
    console.log('[Auth Callback] Error value:', error)
    console.log('[Auth Callback] Cookies count:', Object.keys(req.cookies).length)
    console.log('[Auth Callback] Cookies:', Object.keys(req.cookies))

    // Handle errors from Supabase
    if (error) {
        console.error('[Auth Callback] Error from Supabase:', error)
        return res.redirect(`/login?error=${encodeURIComponent('Password reset link is invalid or expired')}`)
    }

    if (typeof code === 'string') {
        // Check environment variables
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error('[Auth Callback] Missing environment variables');
            console.error('[Auth Callback] URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
            return res.redirect(`/login?error=${encodeURIComponent('Server configuration error')}`)
        }

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return Object.keys(req.cookies).map((name) => ({
                            name,
                            value: req.cookies[name] || '',
                        }))
                    },
                    setAll(cookiesToSet) {
                        console.log('[Auth Callback] Setting cookies:', cookiesToSet.length)
                        res.setHeader(
                            'Set-Cookie',
                            cookiesToSet.map(({ name, value, options }) =>
                                serializeCookieHeader(name, value, options)
                            )
                        )
                    },
                },
            }
        )

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        console.log('[Auth Callback] Exchange result:', { data: !!data, error: !!exchangeError })

        if (exchangeError) {
            console.error('[Auth Callback] Error exchanging code:', exchangeError.message)
            console.error('[Auth Callback] Error details:', exchangeError)
            return res.redirect(`/login?error=${encodeURIComponent('Invalid or expired reset link')}`)
        }

        console.log('[Auth Callback] Code exchanged successfully')
        console.log('[Auth Callback] Session established:', !!data.session)
        console.log('[Auth Callback] User email:', data.session?.user?.email)

        // Check if this is a password recovery flow
        const isRecoveryFlow = next === '/reset-password' || next === '/post-reset-link' || req.query.type === 'recovery';

        if (isRecoveryFlow) {
            console.log('[Auth Callback] Password recovery flow detected');

            // Correctly handle existing cookies to avoid overwriting session cookies
            const setCookieHeader = res.getHeader('Set-Cookie');
            const existingCookies = Array.isArray(setCookieHeader)
                ? setCookieHeader
                : typeof setCookieHeader === 'string'
                    ? [setCookieHeader]
                    : [];

            const isProduction = process.env.NODE_ENV === 'production';
            const recoveryCookie = serializeCookieHeader('password_recovery', 'true', {
                path: '/',
                maxAge: 300, // 5 minutes
                httpOnly: false,
                sameSite: 'lax',
                secure: isProduction
            });

            // LOG: Check if we are merging correctly
            console.log('[Auth Callback] Existing cookies count:', existingCookies.length);

            res.setHeader('Set-Cookie', [...existingCookies, recoveryCookie]);
        }

        if (!data.session && isRecoveryFlow) {
            console.warn('[Auth Callback] WARNING: Exchange successful but no session data returned');
        }
    } else {
        console.warn('[Auth Callback] No code provided in query - check if this is expected')
        // Check if this is a direct access to reset password without code
        if (next === '/reset-password' || next === '/post-reset-link') {
            console.error('[Auth Callback] Denying access to reset-password: no code found');
            return res.redirect(`/login?error=${encodeURIComponent('Please click the reset link from your email')}`)
        }
    }

    console.log('[Auth Callback] Redirecting to FINAL NEXT:', next)
    // Use res.setHeader('Location') manually for cleaner redirection behavior in some Next versions
    res.writeHead(302, { Location: next });
    res.end();
}
