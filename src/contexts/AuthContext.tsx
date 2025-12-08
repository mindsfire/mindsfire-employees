import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export type User = {
  id: string;
  employeeId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'employee';
};

export type MockAccount = User & {
  password: string;
  email?: string;
  department?: string;
  joiningDate?: string;
  status?: 'active' | 'inactive';
};

type AuthContextType = {
  user: User | null;
  login: (employeeId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  testSupabaseConnection?: () => Promise<{ data?: any; error?: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'authUser';
export const CUSTOM_ACCOUNTS_STORAGE_KEY = 'customEmployeeAccounts';

export const DEFAULT_ACCOUNTS: MockAccount[] = [
  {
    id: '1',
    employeeId: 'admin',
    name: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    password: 'Admin@123',
    email: 'admin@example.com',
    department: 'Operations',
    joiningDate: '2023-01-10'
  }
];

export const loadCustomAccounts = (): MockAccount[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(CUSTOM_ACCOUNTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error('Failed to load custom accounts:', error);
    return [];
  }
};

export const getAllAccounts = async (): Promise<MockAccount[]> => {
  try {
    const { data, error } = await supabase
      .schema('attendance')
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(emp => ({
      id: emp.employee_id,
      employeeId: emp.employee_id,
      name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
      firstName: emp.first_name,
      lastName: emp.last_name,
      role: emp.role as 'admin' | 'employee',
      password: emp.password || '',
      department: emp.department || 'N/A',
      email: emp.email || '',
      status: emp.status || 'active'
    })) || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

export const saveCustomAccounts = (accounts: MockAccount[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const upsertCustomAccount = async (account: MockAccount): Promise<void> => {
  try {
    const normalizedEmployeeId = account.employeeId.trim().toLowerCase();

    const { data: existing } = await supabase
      .schema('attendance')
      .from('employees')
      .select('id')
      .eq('employee_id', normalizedEmployeeId)
      .single();

    const employeeData = {
      employee_id: normalizedEmployeeId,
      first_name: account.firstName || '',
      last_name: account.lastName || '',
      full_name: account.name,
      email: account.email,
      department: account.department,
      status: account.status || 'active',
      password: account.password || 'defaultPassword123',
      role: account.role === 'admin' ? 'admin' : 'employee',
    };

    if (existing) {
      const { error } = await supabase
        .schema('attendance')
        .from('employees')
        .update(employeeData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .schema('attendance')
        .from('employees')
        .insert([employeeData]);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving account:', error);
    throw error;
  }
};

export const removeCustomAccounts = async (employeeIds: string[]): Promise<void> => {
  try {
    const { error } = await supabase
      .schema('attendance')
      .from('employees')
      .delete()
      .in('employee_id', employeeIds);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing accounts:', error);
    throw error;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to restore auth session:', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (employeeId: string, password: string) => {
    try {
      const normalizedId = employeeId.trim().toLowerCase();
      console.log('Attempting login with employee_id:', normalizedId);

      // Query employee from employees table
      const { data, error } = await supabase
        .schema('attendance')
        .from('employees')
        .select('*')
        .eq('employee_id', normalizedId)
        .single();

      console.log('Supabase query result:', { data, error });

      if (error || !data) {
        console.log('Employee not found:', normalizedId, 'Error:', error);
        return {
          success: false,
          error: 'Employee ID not found. Please check with your administrator.'
        };
      }

      console.log('Employee found:', data);
      console.log('Stored password:', data.password);
      console.log('Provided password:', password);

      const storedPassword = data.password;

      if (!storedPassword || storedPassword !== password) {
        console.log('Password mismatch');
        return {
          success: false,
          error: 'Incorrect password. Please try again.'
        };
      }

      const authenticatedUser: User = {
        id: data.id,
        employeeId: data.employee_id,
        name: data.full_name,
        role: data.role
      };

      console.log('Login successful:', authenticatedUser);

      setUser(authenticatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Invalid credentials. Please try again.'
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Debug function to test Supabase connection
  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase
        .schema('attendance')
        .from('employees')
        .select('employee_id, full_name, role')
        .limit(5);
      
      console.log('Supabase test result:', { data, error });
      return { data, error };
    } catch (err) {
      console.error('Supabase connection error:', err);
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, testSupabaseConnection }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
