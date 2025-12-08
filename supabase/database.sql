-- =====================================================
-- Complete Database Setup for Attendance System
-- =====================================================
-- This script sets up the entire attendance database schema
-- including tables, data, and permissions

-- =====================================================
-- 1. Create Attendance Schema
-- =====================================================
CREATE SCHEMA IF NOT EXISTS attendance;

-- =====================================================
-- 2. Create Employees Table
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  full_name text NOT NULL,
  email text,
  department text,
  joining_date date,
  status text DEFAULT 'active',
  password text NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Create Attendance Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  login_time timestamptz NOT NULL,
  logout_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_employee
    FOREIGN KEY(employee_id)
    REFERENCES attendance.employees(employee_id)
    ON DELETE CASCADE
);

-- =====================================================
-- 4. Create Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employees_employee_id
  ON attendance.employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id
  ON attendance.attendance_logs(employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_login_time
  ON attendance.attendance_logs(login_time DESC);

-- =====================================================
-- 5. Insert Admin User
-- =====================================================
INSERT INTO attendance.employees (
  employee_id, first_name, last_name, full_name,
  email, department, status, password, role
) VALUES (
  'admin',
  'Admin',
  'User',
  'Admin User',
  'admin@example.com',
  'Administration',
  'active',
  'Admin@123',
  'admin'
) ON CONFLICT (employee_id) DO UPDATE SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name;

-- =====================================================
-- 6. Add Sample Employees (Optional)
-- =====================================================
INSERT INTO attendance.employees (
  employee_id, first_name, last_name, full_name,
  email, department, status, password, role
) VALUES 
  (
    '1001',
    'John',
    'Doe',
    'John Doe',
    'john.doe@example.com',
    'Engineering',
    'active',
    'password123',
    'employee'
  ),
  (
    '1002',
    'Jane',
    'Smith',
    'Jane Smith',
    'jane.smith@example.com',
    'Marketing',
    'active',
    'password123',
    'employee'
  )
) ON CONFLICT (employee_id) DO NOTHING;

-- =====================================================
-- 7. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE attendance.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance.attendance_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. Create Permissive Policies for Development
-- =====================================================
-- Employees table policies
DROP POLICY IF EXISTS "Allow all access to employees" ON attendance.employees;
CREATE POLICY "Allow all access to employees"
  ON attendance.employees
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Attendance logs policies
DROP POLICY IF EXISTS "Allow all access to attendance_logs" ON attendance.attendance_logs;
CREATE POLICY "Allow all access to attendance_logs"
  ON attendance.attendance_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 9. Grant Permissions
-- =====================================================
GRANT USAGE ON SCHEMA attendance TO anon, authenticated, postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA attendance TO anon, authenticated, postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA attendance TO anon, authenticated, postgres;

-- =====================================================
-- 10. Expose Schema to API (if supported)
-- =====================================================
-- Note: This may require Supabase restart or support intervention
ALTER DATABASE postgres SET "api.exposed_schemas" = 'public, attendance';

-- =====================================================
-- 11. Verification Queries
-- =====================================================
-- Check tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'attendance' 
ORDER BY table_name;

-- Check foreign key constraints
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'attendance_logs'
  AND tc.table_schema = 'attendance';

-- Check admin user
SELECT employee_id, full_name, role, email, status 
FROM attendance.employees 
WHERE employee_id = 'admin';

-- Check all employees
SELECT employee_id, full_name, role, department, status 
FROM attendance.employees 
ORDER BY employee_id;

-- =====================================================
-- 12. Sample Attendance Data (Optional)
-- =====================================================
INSERT INTO attendance.attendance_logs (employee_id, login_time, logout_time)
VALUES 
  ('admin', now() - interval '8 hours', now() - interval '1 hour'),
  ('1001', now() - interval '9 hours', now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Complete Setup
-- =====================================================
-- Your attendance database is now ready!
-- Tables: attendance.employees, attendance.attendance_logs
-- Admin credentials: employee_id='admin', password='Admin@123'
-- Sample employees: 1001, 1002 (password: password123)
