-- =====================================================
-- Complete Database Setup for Attendance System (Email Based)
-- =====================================================
-- WARNING: Running this will WIPE existing data if you drop tables first.
-- logical flow: Drop old -> Create new



-- 1. Create Schema
CREATE SCHEMA IF NOT EXISTS attendance;

-- 2. Create Employees Table (Email is the unique identifier now)
CREATE TABLE attendance.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,  -- Replaces employee_id
  first_name text,
  last_name text,
  full_name text NOT NULL,
  department text,
  joining_date date,
  status text DEFAULT 'active',
  password text NOT NULL, -- Stored locally just for reference/simple auth if needed involved, but mainly relies on Supabase Auth
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create Logs Table
CREATE TABLE attendance.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL, -- Links to employees.email
  login_time timestamptz NOT NULL,
  logout_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_employee
    FOREIGN KEY(email)
    REFERENCES attendance.employees(email)
    ON DELETE CASCADE
);

-- 4. Indexes
CREATE INDEX idx_employees_email ON attendance.employees(email);
CREATE INDEX idx_attendance_email ON attendance.attendance_logs(email);
CREATE INDEX idx_attendance_login_time ON attendance.attendance_logs(login_time DESC);

-- 5. Enable RLS
ALTER TABLE attendance.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance.attendance_logs ENABLE ROW LEVEL SECURITY;

-- 6. Policies (Open for development)
CREATE POLICY "Allow all access to employees" ON attendance.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendance_logs" ON attendance.attendance_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Grant Permissions
GRANT USAGE ON SCHEMA attendance TO anon, authenticated, postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA attendance TO anon, authenticated, postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA attendance TO anon, authenticated, postgres;

-- 8. Insert YOUR Admin User
-- REPLACE the values below with your desired Admin details
INSERT INTO attendance.employees (
  email, 
  first_name, 
  last_name, 
  full_name,
  password, 
  role,
  department
) VALUES (
  'admin@company.com',   -- CHANGE THIS
  'Admin',
  'User',
  'System Admin',
  'SecretPass123',       -- CHANGE THIS (Local reference only)
  'admin',
  'IT'
);

-- NOTE: You MUST also create this exact user in Supabase Authentication Dashboard!
