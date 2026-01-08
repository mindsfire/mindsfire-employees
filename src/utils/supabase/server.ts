import { createServerClient, serializeCookieHeader } from '@supabase/ssr'
import { type GetServerSidePropsContext } from 'next'

export function createClient(context: GetServerSidePropsContext) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return Object.keys(context.req.cookies).map((name) => ({
                        name,
                        value: context.req.cookies[name] || '',
                    }))
                },
                setAll(cookiesToSet) {
                    context.res.setHeader(
                        'Set-Cookie',
                        cookiesToSet.map(({ name, value, options }) =>
                            serializeCookieHeader(name, value, options)
                        )
                    )
                },
            },
        }
    )
}
