import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { email, password, fullName, role, department } = req.body

    // Debug logging
    console.log('Received data:', { email, password, fullName, role, department })

    if (!email || !password || !fullName) {
        console.log('Missing fields:', { email: !!email, password: !!password, fullName: !!fullName })
        return res.status(400).json({ message: 'Missing required fields' })
    }

    // initialize Supabase Admin Client
    // This requires the SERVICE ROLE KEY to be set in .env.local
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    try {
        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm the user so they can login immediately
            user_metadata: { full_name: fullName }
        })

        if (authError) throw authError

        // 2. Insert into the attendance.employees table
        // We use the email as the link.
        const { error: dbError } = await supabaseAdmin
            .schema('attendance')
            .from('employees')
            .insert({
                email,
                full_name: fullName,
                role: role || 'employee',
                department: department || '',
                password: password, // Storing purely for reference/admin visibility as requested, though usually discouraged
                // employee_id: employeeId // If you still have this column and want to keep it, uncomment. But we moved to email.
            })

        if (dbError) {
            // Rollback: try to delete the auth user if DB insert fails to keep consistency
            if (authData.user) {
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            }
            throw dbError
        }

        return res.status(200).json({ message: 'User created successfully', user: authData.user })

    } catch (error: unknown) {
        console.error('Error creating employee:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return res.status(500).json({ message: errorMessage || 'Internal Server Error' })
    }
}
