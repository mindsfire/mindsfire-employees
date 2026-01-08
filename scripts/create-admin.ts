import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars! Check .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
    const email = 'admin@company.com'
    const password = 'SecretPass123'

    console.log(`Creating Auth user for: ${email}`)

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        console.error('Error creating user:', error.message)
    } else {
        console.log('User created successfully!')
        console.log('Email:', email)
        console.log('Password:', password)
        // If not using Service Role, we might need manual confirmation depending on settings
        if (!data.session) {
            console.log('WARNING: You might need to confirm this email in Supabase Dashboard -> Authentication -> Users.')
        }
    }
}

createAdmin()
