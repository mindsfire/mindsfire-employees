import { createContext, useContext, useState, ReactNode } from 'react';

type User = {
  id: string;
  employeeId: string;
  name: string;
  role: 'admin' | 'employee';
};

type AuthContextType = {
  user: User | null;
  login: (employeeId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading] = useState(false);

  const login = async (employeeId: string, password: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user - in a real app, this would come from your backend
      const mockUser: User = {
        id: '1',
        employeeId,
        name: employeeId === 'admin' ? 'Admin User' : 'Employee User',
        role: employeeId === 'admin' ? 'admin' : 'employee'
      };

      setUser(mockUser);
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
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
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
