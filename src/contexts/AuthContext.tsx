import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type User = {
  id: string;
  employeeId: string;
  name: string;
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'authUser';
export const CUSTOM_ACCOUNTS_STORAGE_KEY = 'customEmployeeAccounts';

export const DEFAULT_ACCOUNTS: MockAccount[] = [
  {
    id: '1',
    employeeId: 'admin',
    name: 'Admin User',
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

export const getAllAccounts = (): MockAccount[] => {
  const byEmployeeId = new Map<string, MockAccount>();
  DEFAULT_ACCOUNTS.forEach(account => {
    byEmployeeId.set(account.employeeId.toLowerCase(), account);
  });
  loadCustomAccounts().forEach(account => {
    byEmployeeId.set(account.employeeId.toLowerCase(), account);
  });
  return Array.from(byEmployeeId.values());
};

export const saveCustomAccounts = (accounts: MockAccount[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const upsertCustomAccount = (account: MockAccount) => {
  const existing = loadCustomAccounts();
  const normalizedId = account.employeeId.toLowerCase();
  const next = existing.filter(acc => acc.employeeId.toLowerCase() !== normalizedId);
  next.push(account);
  saveCustomAccounts(next);
};

export const removeCustomAccounts = (employeeIds: string[]) => {
  if (employeeIds.length === 0) return;
  const targets = new Set(employeeIds);
  const remaining = loadCustomAccounts().filter(
    acc => !targets.has(acc.id)
  );
  saveCustomAccounts(remaining);
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const normalizedId = employeeId.trim().toLowerCase();
      const allAccounts = getAllAccounts();
      console.log('All accounts:', allAccounts);
      console.log('Looking for employee ID:', normalizedId);
      
      const account = allAccounts.find(
        (acc: MockAccount) => acc.employeeId.toLowerCase() === normalizedId
      );

      console.log('Found account:', account);

      if (!account) {
        return {
          success: false,
          error: 'Employee ID not found. Please check with your administrator.'
        };
      }

      console.log('Password check - provided:', password, 'stored:', account.password);

      if (account.password !== password) {
        return {
          success: false,
          error: 'Incorrect password. Please try again.'
        };
      }

      const authenticatedUser: User = {
        id: account.id,
        employeeId: account.employeeId,
        name: account.name,
        role: account.role
      };

      setUser(authenticatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
      return { success: true };
    } catch (error) {
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

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
