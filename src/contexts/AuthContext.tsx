import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '../utils/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export type User = {
  id: string;
  email: string; // Primary Key
  name: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'employee';
  department?: 'IT' | 'Virtual Assistant' | 'Sales';
};

export type MockAccount = User & {
  department?: string;
  joiningDate?: string;
  status?: 'active' | 'inactive';
};

type DatabaseEmployee = {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  department?: string;
  status?: string;
  joining_date?: string | Date;
  created_at?: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  requiresPasswordChange: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const CUSTOM_ACCOUNTS_STORAGE_KEY = 'customEmployeeAccounts';

// Initialize Supabase client
const supabase = createClient();

export const loadCustomAccounts = (): MockAccount[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom accounts:', error);
    return [];
  }
};

export const getAllAccounts = async (): Promise<MockAccount[]> => {
  try {
    // We now use the 'email' column instead of employee_id
    const { data, error } = await supabase
      .schema('attendance')
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map((emp: DatabaseEmployee) => {
      let formattedJoiningDate = '';
      if (emp.joining_date) {
        try {
          formattedJoiningDate = typeof emp.joining_date === 'string'
            ? emp.joining_date
            : new Date(emp.joining_date).toISOString().split('T')[0];
        } catch {
          formattedJoiningDate = '';
        }
      }

      return {
        id: emp.id, // UUID
        email: emp.email,
        name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
        firstName: emp.first_name,
        lastName: emp.last_name,
        role: emp.role as 'admin' | 'employee',
        department: emp.department || 'N/A',
        status: emp.status || 'active',
        joiningDate: formattedJoiningDate
      };
    }) || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

// Function using API route should likely replace this, but keeping for compatibility if admin.tsx calls it directly
export const upsertCustomAccount = async (account: MockAccount): Promise<void> => {
  try {
    if (!account.email) throw new Error("Email is required");

    const normalizedEmail = account.email.trim().toLowerCase();

    // Check by EMAIL now
    const { data: existing } = await supabase
      .schema('attendance')
      .from('employees')
      .select('email') // query by email
      .eq('email', normalizedEmail)
      .single();

    const employeeData = {
      // No employee_id
      first_name: account.firstName || '',
      last_name: account.lastName || '',
      full_name: account.name,
      email: normalizedEmail,
      department: account.department,
      joining_date: account.joiningDate || null,
      status: account.status || 'active',
      role: account.role === 'admin' ? 'admin' : 'employee',
    };

    if (existing) {
      const { error } = await supabase
        .schema('attendance')
        .from('employees')
        .update(employeeData)
        .eq('email', normalizedEmail); // update by email

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

export const removeCustomAccounts = async (emails: string[]): Promise<void> => {
  try {
    // Use the new complete deletion API that deletes from both employees table and Supabase Auth
    const response = await fetch('/api/admin/delete-employees', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete employees');
    }

    console.log('Delete response:', data);
  } catch (error) {
    console.error('Error removing accounts:', error);
    throw error;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('AuthContext: Error getting session', error);
        }

        if (session?.user?.email) {
          const { data: employee, error: dbError } = await supabase
            .schema('attendance')
            .from('employees')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (dbError) {
            console.error('AuthContext: Database fetch error', dbError);
          }

          if (mounted) {
            if (employee) {
              setUser({
                id: employee.id,
                email: employee.email,
                name: employee.full_name,
                role: employee.role,
                firstName: employee.first_name,
                lastName: employee.last_name,
                department: employee.department
              });

              // Check if user needs to change password
              // Now that password_changed field exists, check its value
              const needsPasswordChange = !employee.password_changed || employee.password_changed === false;

              if (needsPasswordChange) {
                setRequiresPasswordChange(true);
              } else {
                setRequiresPasswordChange(false);
              }
            } else {
              if (mounted) {
                setUser(null);
                setRequiresPasswordChange(false);
              }
            }
          }
        } else {
          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (session?.user?.email) {
        // First try to find existing employee
        const { data: employee } = await supabase
          .schema('attendance')
          .from('employees')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (employee) {
          setUser({
            id: employee.id,
            email: employee.email,
            name: employee.full_name,
            role: employee.role,
            firstName: employee.first_name,
            lastName: employee.last_name,
            department: employee.department
          });

          // Check if user needs to change password
          const needsPasswordChange = !employee.password_changed || employee.password_changed === false;
          setRequiresPasswordChange(needsPasswordChange);
        } else if (event === 'SIGNED_IN') {
          // Auto-create employee if doesn't exist
          const { data: newEmployee } = await supabase
            .schema('attendance')
            .from('employees')
            .insert({
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email,
              first_name: session.user.user_metadata?.first_name || '',
              last_name: session.user.user_metadata?.last_name || '',
              role: 'employee',
              department: 'General'
            })
            .select()
            .single();

          if (newEmployee) {
            setUser({
              id: newEmployee.id,
              email: newEmployee.email,
              name: newEmployee.full_name,
              role: newEmployee.role,
              firstName: newEmployee.first_name,
              lastName: newEmployee.last_name,
              department: newEmployee.department
            });

            // New employees always need to change password
            const needsPasswordChange = true;
            setRequiresPasswordChange(needsPasswordChange);
          }
        }
      } else {
        setUser(null);
        setRequiresPasswordChange(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRequiresPasswordChange(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to change password' };
      }

      // Clear password change requirement after successful change
      setRequiresPasswordChange(false);

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, loading, requiresPasswordChange }}>
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
