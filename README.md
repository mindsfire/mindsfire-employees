# Local Employee Attendance Logger

A Next.js application for tracking employee attendance with local storage and Supabase integration.

## Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js) or **yarn**/**pnpm** as your package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd local-employee-attendance-logger
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Dependencies

This project uses the following key dependencies:

- **Next.js** - React framework
- **React** - UI library
- **Supabase** - Backend-as-a-Service for database
- **React Hook Form** - Form handling
- **date-fns** - Date manipulation utilities
- **UUID** - Unique identifier generation
- **Tailwind CSS** - Styling framework

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration. The pipeline is configured in `.github/workflows/ci.yml` and includes:

### Pipeline Triggers
- **Pull requests** to any branch
- **Pushes** to the `main` branch

### Pipeline Steps
1. **Code Checkout** - Fetches the latest code
2. **Node.js Setup** - Uses Node.js version 20 with npm caching
3. **Dependency Installation** - Runs `npm ci` for clean installs
4. **Linting** - Runs ESLint to ensure code quality
5. **Type Checking** - Runs TypeScript compiler checks
6. **Build** - Creates production build to verify compatibility

### Required Secrets
To run the CI pipeline successfully, configure these repository secrets:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Complete Setup Guide

### 1. Prerequisites
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js) or **yarn**/**pnpm** as your package manager
- **Git** for version control
- **Supabase account** for backend services

### 2. Local Development Setup

#### Step 1: Clone and Install
```bash
git clone <repository-url>
cd local-employee-attendance-logger
npm install
```

#### Step 2: Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Step 3: Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy the Project URL and Anonymous Key
4. Add them to your `.env.local` file

#### Step 4: Database Setup
Run the SQL migration script to set up the required tables:
```sql
-- Create employees table
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Step 5: Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Production Deployment

#### Build for Production
```bash
npm run build
npm start
```

#### Environment Variables for Production
Ensure the same environment variables are set in your production environment.

## Troubleshooting

### Common Issues
1. **Build fails**: Check that all environment variables are properly set
2. **Supabase connection errors**: Verify your Supabase URL and keys are correct
3. **TypeScript errors**: Run `npm run lint` to check for code issues

### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type check only
npx tsc --noEmit
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Hook Form](https://react-hook-form.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
