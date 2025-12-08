# Local Employee Attendance Logger – Supabase Postgres Migration (Intern Guide)

## 1. Goal / Overview

The existing **Local Employee Attendance Logger** stores **everything in `localStorage`**:

- **Attendance records** (clock in / clock out logs)
- **Employee accounts** (admin + employees)
- **Auth session** (who is logged in)

This works for a single machine but does **not scale** to:

- Multiple users / machines
- Shared history
- Long-term storage and analytics

In this assignment you will **move the data layer to Supabase Postgres** while keeping the **Next.js UI and UX mostly the same**.

You will:

- Create a **Supabase project** and **Postgres tables**.
- Connect the Next.js app to Supabase using the **Supabase JS client**.
- Replace `localStorage` for:
  - Attendance records (primary focus)
  - Employee accounts (admin + employees).
- Keep the app running locally with `npm run dev`, but now data will live in **Supabase**.

> ❗ **Security note (for interns)**: This is a **learning project**, not production. We will not cover full security best practices (password hashing, RLS by user, etc.). Never copy this auth design directly into a real production system.

---

## 2. Current App – What Uses `localStorage`

Scan these files in the `local-employee-attendance-logger` project:

- **Attendance data**
  - `src/pages/index.tsx`
    - Reads, writes, and deletes `localStorage['attendanceRecords']`.
  - `src/reducers/attendanceReducer.ts`
    - Has a helper `loadRecordsFromStorage()` that also reads `localStorage['attendanceRecords']`.
  - `src/context/AttendanceContext.tsx`
    - Uses `STORAGE_KEY = 'employeeAttendanceRecords'` (older/alternate storage key).

- **Auth + employee accounts**
  - `src/contexts/AuthContext.tsx`
    - `authUser` (logged-in user) in `localStorage['authUser']`.
    - `customEmployeeAccounts` (non-default employees) in `localStorage['customEmployeeAccounts']`.
  - `src/pages/login.tsx`
    - “Remember me” uses `localStorage['rememberedEmployeeId']`.
  - `src/pages/admin.tsx`
    - Uses `getAllAccounts`, `upsertCustomAccount`, `removeCustomAccounts` from `AuthContext` (which currently all depend on `localStorage`).

When we move to Supabase:

- **Attendance records** and **employee accounts** must move to **Postgres tables**.
- `rememberedEmployeeId` can **stay** in `localStorage` (it’s just a UI helper).
- `authUser` can still be stored in `localStorage` as a small object, but its data should come from **Supabase** instead of from an in-browser array.

---

## 3. Target Supabase Architecture

We will create **two main tables** in Supabase:

1. **`employees`** – replaces `MockAccount[]` in `AuthContext`.
2. **`attendance_logs`** – replaces `attendanceRecords` array in `index.tsx`.

### 3.1 `employees` table

Represents each user (admin or employee) that can log in.

Suggested columns:

- `id` – `uuid`, primary key, `default gen_random_uuid()`
- `employee_id` – `text`, **unique**, what users type on login (e.g. `admin`, `ABCD1234`)
- `first_name` – `text`
- `last_name` – `text`
- `full_name` – `text` (or a generated column combining first + last)
- `role` – `text`, one of `'admin' | 'employee'`
- `department` – `text` (optional)
- `email` – `text` (optional)
- `joining_date` – `date` (optional)
- `status` – `text`, default `'active'`
- `password` – `text` (for this learning project only; in real apps this must be a **hashed** password)
- `created_at` – `timestamptz`, default `now()`

### 3.2 `attendance_logs` table

Represents each clock in / clock out record.

Suggested columns:

- `id` – `uuid`, primary key, `default gen_random_uuid()`
- `employee_id` – `uuid` (FK to `employees.id`)
- `employee_code` – `text` (copy of `employees.employee_id` for easier debugging/filtering)
- `employee_name` – `text` (copy of `employees.full_name` or `name`)
- `login_time` – `timestamptz` (when the user clocked in)
- `logout_time` – `timestamptz` (when they clocked out; can be `null`)
- `created_at` – `timestamptz`, default `now()`

This structure lets you:

- Filter records **per employee**.
- Keep almost the same UI logic (the app already calculates statuses and durations from the `Date` values).

---

## 4. Prerequisites

- Node.js and npm installed (already required by the existing project).
- A working local clone of `local-employee-attendance-logger`.
- A **Supabase account** (create one at `https://supabase.com`).

---

## 5. Step-by-Step: Supabase Setup

### 5.1 Create a Supabase project

1. Log in to Supabase.
2. Click **“New Project”**.
3. Choose an **organization**, **project name**, **database password**, and a **region**.
4. Wait for Supabase to provision the database.

You will need two values from **Project Settings → API**:

- `Project URL`
- `anon` public API key

Keep this page open; you’ll copy these into your `.env.local`.

### 5.2 Install Supabase client in the Next.js project

From the `local-employee-attendance-logger` folder:

```bash
npm install @supabase/supabase-js
```

Commit this change as something like:

```text
chore: add supabase client dependency
```

### 5.3 Add environment variables

Create a file named **`.env.local`** at the root of `local-employee-attendance-logger` (same level as `package.json`) with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Notes:

- The `NEXT_PUBLIC_` prefix makes these values available in the **browser** (client-side).
- Do **not** commit real keys to public GitHub repos. For training in a private repo, this is acceptable, but still avoid pushing secrets when possible.

### 5.4 Create the database tables (SQL)

In the Supabase dashboard:

1. Go to **SQL Editor**.
2. Create the **`employees`** table:

```sql
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  first_name text,
  last_name text,
  full_name text,
  role text not null check (role in ('admin', 'employee')),
  department text,
  email text,
  joining_date date,
  status text default 'active',
  password text not null,
  created_at timestamptz not null default now()
);
```

3. Create the **`attendance_logs`** table:

```sql
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  employee_code text not null,
  employee_name text not null,
  login_time timestamptz not null,
  logout_time timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_logs_employee_id_login_time
  on public.attendance_logs (employee_id, login_time desc);
```

4. (Optional, for dev only) Set up **very simple policies** so the anon key can read/write.

For this learning project you can allow full access to these tables from the client. In a real system you would **never** do this.

Follow the Supabase docs to:

- Enable Row Level Security on both tables.
- Add simple policies that allow `select/insert/update/delete` for `public` (anon) in **development only**.

If you get stuck, ask for help instead of randomly clicking.

### 5.5 Seed an initial admin user

In the **SQL Editor**, insert one admin account that mirrors the existing hard-coded `DEFAULT_ACCOUNTS`:

```sql
insert into public.employees (
  employee_id,
  first_name,
  last_name,
  full_name,
  role,
  department,
  email,
  joining_date,
  status,
  password
) values (
  'admin',
  'Admin',
  'User',
  'Admin User',
  'admin',
  'Operations',
  'admin@example.com',
  '2023-01-10',
  'active',
  'Admin@123'
)
on conflict (employee_id) do nothing;
```

You can now log in with:

- **Employee ID**: `admin`
- **Password**: `Admin@123`

---

## 6. Step-by-Step: Code Changes (High-Level Plan)

### 6.1 Create a shared Supabase client helper

Create a new file, for example:

- `src/lib/supabaseClient.ts`

Inside, export a single shared client:

```ts
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Use this client from pages and contexts instead of creating new clients everywhere.

### 6.2 Migrate employee accounts (AuthContext → Supabase)

File to update:

- `src/contexts/AuthContext.tsx`

Changes:

1. **Remove** the logic that reads/writes `customEmployeeAccounts` from `localStorage`.
2. Introduce new async helpers that talk to Supabase:
   - `fetchEmployees` – `select * from employees` (used by admin page).
   - `upsertEmployee` – `insert` or `update` into `employees`.
   - `deleteEmployees` – `delete from employees where id in (...)`.
3. Update `getAllAccounts` to:
   - Query Supabase instead of merging `DEFAULT_ACCOUNTS` + `loadCustomAccounts()`.
   - For this project, replace `DEFAULT_ACCOUNTS` by seeding via SQL (step 5.5).
4. Update the `login` function:
   - Query Supabase for `employee_id = normalizedId`.
   - Compare the submitted `password` with the `password` column.
   - If valid, construct the `User` object from the Supabase row and store it in `localStorage['authUser']` (this part can stay as-is).

You do **not** need to use Supabase Auth for this assignment – just use the `employees` table.

### 6.3 Migrate Admin employee management page to Supabase

File to update:

- `src/pages/admin.tsx`

Changes:

1. Replace `getAllAccounts()` with a call to Supabase (`select * from employees order by created_at desc`).
2. Replace `upsertCustomAccount()` with a function that:
   - Builds the employee payload from the form.
   - Calls Supabase `insert` (for new employee) or `update` (for existing).
3. Replace `removeCustomAccounts()` with a Supabase `delete` by `id`.
4. Keep the UI and form mostly the same; only the **data source changes**.

Commit messages example:

- `feat: load employees from supabase instead of localStorage`
- `feat: save admin-created employees to supabase`

### 6.4 Migrate attendance logs to Supabase

Primary file to update:

- `src/pages/index.tsx`

Changes:

1. **Loading records on mount**:
   - Replace the `localStorage.getItem('attendanceRecords')` logic with:
     - For admins: `select * from attendance_logs order by login_time desc`.
     - For employees: `select * from attendance_logs where employee_id = currentUserId order by login_time desc`.
   - Convert the `login_time` and `logout_time` strings from Supabase into `Date` objects for the UI.
   - Apply the same auto-close and retention logic on the in-memory array (you **do not** need to move that logic into the database).

2. **Clock In**:
   - Instead of:
     - Creating a `newRecord` in memory and saving the whole array to `localStorage`.
   - Do:
     - `insert into attendance_logs` with:
       - `employee_id` (from `user.id`)
       - `employee_code` (from `user.employeeId`)
       - `employee_name` (from `user.name`)
       - `login_time = new Date().toISOString()`
     - Use the inserted row to update React state (`setRecords`).

3. **Clock Out**:
   - Instead of mapping over `records` and writing the whole array back to `localStorage`:
   - Call Supabase `update attendance_logs set logout_time = now()` where `id = currentSessionId`.
   - Update React state with the updated record.

4. **Clear all data**:
   - For admin: call Supabase `delete from attendance_logs` (possibly with a confirmation).
   - For a regular employee: only delete rows where `employee_id = currentUserId`.
   - Update React state to `[]`.

5. **Export to CSV**:
   - Keep as-is; it already works on the in-memory `records` array.

### 6.5 (Optional) Clean up old `AttendanceContext` + reducer

The current app has both:

- `src/context/AttendanceContext.tsx`
- `src/reducers/attendanceReducer.ts`

but `src/pages/index.tsx` manages its own `useState` for attendance. As an optional refactor:

- Either:
  - Remove `AttendanceContext` and unused reducer helpers.
- Or:
  - Move all attendance fetching and Supabase writes into `AttendanceContext` and let `index.tsx` consume that context.

Do this only **after** the Supabase integration is working.

---

## 7. Data Migration Strategy

For this assignment you can **start fresh** in Supabase:

- It is acceptable to **ignore old `localStorage` data** and let everyone start with empty tables.
- The app already has a **“Clear All Data”** option which will now be implemented against Supabase instead of `localStorage`.

If you want to practice:

- You can write a small script (in the browser console) to read old `localStorage['attendanceRecords']` and **insert** them into Supabase using the API.
- This is **optional** and not required for the core assignment.

---

## 8. Testing Checklist

Use this checklist after your changes:

- **Setup**
  - `npm run dev` starts without TypeScript or runtime errors.
  - No Supabase import errors.

- **Auth / Employees**
  - You can log in as `admin` / `Admin@123`.
  - Admin dashboard loads employees from Supabase.
  - Creating, editing, and deleting employees updates the Supabase `employees` table and the UI.

- **Attendance**
  - As an employee, you can **Clock In** and **Clock Out** without errors.
  - Records appear on the main dashboard.
  - Refreshing the page still shows attendance logs (because they come from Supabase).
  - “Clear all data” works and deletes the correct rows from `attendance_logs`.

- **Role behavior**
  - Admin can see **all** attendance logs.
  - Employee sees **only their own** logs (assuming you filter by `employee_id`).

---

## 9. Deliverables

By the end of this migration you should provide:

1. **Working local app with Supabase backing**
   - `npm run dev` runs without errors.
   - Attendance data and employee accounts live in Supabase.

2. **Database schema**
   - `employees` and `attendance_logs` tables created in Supabase.
   - At least one admin user seeded.

3. **Code changes committed with clear messages**
   - Example:
     - `feat: connect attendance dashboard to supabase`
     - `feat: migrate admin employee management to supabase`
     - `chore: add supabase client and env config`

4. **Short notes for reviewers**
   - Add/extend a `notes.md` in the project to explain:
     - Where Supabase is used.
     - Any compromises (e.g. plain-text passwords because this is a training app).
     - Follow-up ideas (use Supabase Auth, add better RLS policies, etc.).

---

## 10. Nice-to-Have Extensions (Only After Core Is Solid)

If you finish the core migration early, consider:

- **Use Supabase Auth** instead of the custom `employees + password` approach.
- **Add filtering and pagination** using Supabase queries for large attendance datasets.
- **Add aggregates** (e.g. total hours per month) using Supabase RPC or views.
- **Harden security** by:
  - Hashing passwords.
  - Using proper RLS policies per user.
  - Removing “allow everything” dev policies.

These are **optional** and should only be attempted once the main migration is complete and stable.


