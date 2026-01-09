import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { currentPassword, newPassword } = req.body

    // Validate input
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' })
    }

    // Get authorization header to verify user is authenticated
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Get the user's session from the token
        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1])

        if (userError || !user) {
            return res.status(401).json({ message: 'Invalid or expired token' })
        }

        // Verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword,
        })

        if (signInError) {
            return res.status(400).json({ message: 'Current password is incorrect' })
        }

        // Update the user's password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (updateError) {
            console.error('Password update error:', updateError)
            return res.status(500).json({ message: 'Failed to update password' })
        }

        // Update the password_changed flag in the employees table
        const { error: dbError } = await supabase
            .schema('attendance')
            .from('employees')
            .update({ password_changed: true })
            .eq('email', user.email!)

        if (dbError) {
            console.error('Database update error:', dbError)
            // Don't fail the request if the flag update fails, but log it
            console.warn('Password updated but flag update failed')
        }

        return res.status(200).json({ message: 'Password changed successfully' })

    } catch (error) {
        console.error('Change password error:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}
