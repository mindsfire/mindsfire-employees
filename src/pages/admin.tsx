import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  MockAccount,
  getAllAccounts,
  removeCustomAccounts,
  upsertCustomAccount,
  useAuth
} from '../contexts/AuthContext';

type EmployeeFormState = {
  id: string;
  name: string;
  employeeId: string;
  role: 'admin' | 'employee';
  joiningDate: string;
  password: string;
};

const initialFormState: EmployeeFormState = {
  id: '',
  name: '',
  employeeId: '',
  role: 'employee',
  joiningDate: '',
  password: ''
};

const generateEmployeeId = (name: string): string => {
  if (!name.trim()) return '';
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0].substring(0, 3).toUpperCase();
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].substring(0, 3).toUpperCase() : 'XXX';
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${firstName}${lastName}${randomNum}`;
};

const generatePassword = (name: string): string => {
  if (!name.trim()) return 'Temp123';
  const cleanName = name.trim().replace(/\s+/g, '').toLowerCase();
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `${cleanName}${randomNum}`;
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [employees, setEmployees] = useState<MockAccount[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);

  const loadEmployees = () => {
    setEmployees(getAllAccounts());
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.push('/');
    } else if (!loading && user?.role === 'admin') {
      loadEmployees();
    }
  }, [user, loading, router]);

  const allVisibleSelected = useMemo(
    () => employees.length > 0 && selectedEmployeeIds.length === employees.length,
    [employees, selectedEmployeeIds]
  );

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map(emp => emp.employeeId));
    }
  };

  const toggleSelection = (employeeId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
    );
  };

  const openCreateModal = () => {
    const newId = `${Date.now()}`;
    setFormState({ 
      ...initialFormState, 
      id: newId,
      password: generatePassword('')
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: MockAccount) => {
    setFormState({
      id: account.id,
      name: account.name,
      employeeId: account.employeeId,
      role: account.role,
      joiningDate: account.joiningDate || '',
      password: account.password
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormState(initialFormState);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState(prev => {
      const newState = { ...prev, [name]: value };
      
      // Auto-generate employee ID and password when name changes (only for new employees)
      // Check if this is a new employee by seeing if the ID is a timestamp (13+ digits)
      const isNewEmployee = prev.id.length > 10 && /^\d+$/.test(prev.id);
      if (name === 'name' && (isNewEmployee || !prev.employeeId)) {
        newState.employeeId = generateEmployeeId(value);
        newState.password = generatePassword(value);
      }
      
      return newState;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim() || !formState.employeeId.trim()) {
      setStatusMessage('Name and Employee ID are required.');
      return;
    }

    const account: MockAccount = {
      id: formState.id || `${Date.now()}`,
      employeeId: formState.employeeId.trim(),
      name: formState.name.trim(),
      role: formState.role,
      joiningDate: formState.joiningDate,
      password: formState.password || 'Temp@1234'
    };

    upsertCustomAccount(account);
    loadEmployees();
    setStatusMessage(`Saved ${account.name}.`);
    closeModal();
  };

  const handleDelete = () => {
    if (selectedEmployeeIds.length === 0) return;
    
    // Get the names of employees to be deleted for the confirmation message
    const employeesToDelete = employees.filter(emp => 
      selectedEmployeeIds.includes(emp.employeeId)
    );
    const employeeNames = employeesToDelete.map(emp => emp.name).join(', ');
    
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to delete the following employee(s):\n\n${employeeNames}\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      // Get the actual account IDs from the employees array
      const accountIdsToDelete = employees
        .filter(emp => selectedEmployeeIds.includes(emp.employeeId))
        .map(emp => emp.id);
      removeCustomAccounts(accountIdsToDelete);
      setSelectedEmployeeIds([]);
      loadEmployees();
      setStatusMessage(`Successfully removed ${selectedEmployeeIds.length} employee(s).`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return <div>Redirecting to login...</div>;
  }

  if (user.role !== 'admin') {
    return <div>Access denied. Admins only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Navigation Bar */}
      <div className="bg-slate-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <svg className="h-6 w-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
              <h1 className="text-white text-xl font-bold">Admin Control Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm font-medium">Admin</span>
              </div>
              <span className="text-gray-300 text-sm">{user.name}</span>
              <button 
                onClick={logout}
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Header Stats */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
              <p className="text-sm text-gray-600 mt-1">Manage system users and access permissions</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-xs text-gray-500">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {employees.filter(emp => emp.role === 'admin').length}
                </div>
                <div className="text-xs text-gray-500">Admins</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg border">
          {statusMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{statusMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <div className="flex space-x-3">
              <button 
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add New Employee
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedEmployeeIds.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
                }`}
                disabled={selectedEmployeeIds.length === 0}
                onClick={handleDelete}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Remove Selected ({selectedEmployeeIds.length})
              </button>
            </div>
          </div>

          {/* Employee Table */}
          <div className="overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={allVisibleSelected} 
                    onChange={toggleAll} 
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">System Users</span>
                </label>
                <div className="flex items-center space-x-8">
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide w-32 text-center">Access Level</span>
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide w-32 text-center">Join Date</span>
                  <span className="w-20 text-center">
                    <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Actions</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {employees.map(account => (
                <div key={account.employeeId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <label className="flex items-center flex-1">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(account.employeeId)}
                      onChange={() => toggleSelection(account.employeeId)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{account.name}</div>
                      <div className="text-sm text-gray-500">ID: {account.employeeId}</div>
                    </div>
                  </label>
                  <div className="flex items-center space-x-8">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      account.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {account.role === 'admin' ? 'Administrator' : 'Employee'}
                    </span>
                    <span className="text-sm text-gray-600 w-32 text-center">{formatDate(account.joiningDate || '')}</span>
                    <div className="w-20 text-center">
                      <button 
                        onClick={() => openEditModal(account)}
                        className="text-emerald-600 hover:text-emerald-900 text-sm font-medium inline-flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first employee.</p>
                  <div className="mt-6">
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Add New Employee
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <form onSubmit={handleSubmit}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {formState.id ? 'Edit Employee' : 'Create Employee'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formState.employeeId}
                  onChange={handleFormChange}
                  required
                  placeholder="Auto-generated from name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formState.joiningDate}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formState.role}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <input
                  type="text"
                  name="password"
                  value={formState.password}
                  onChange={handleFormChange}
                  placeholder="Auto-generated"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                />
                <button
                  type="button"
                  onClick={() => setFormState(prev => ({ ...prev, password: generatePassword(prev.name) }))}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  Regenerate Password
                </button>
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
