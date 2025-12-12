import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  MockAccount,
  getAllAccounts,
  removeCustomAccounts,
  upsertCustomAccount,
  useAuth
} from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';

type EmployeeFormState = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role: 'admin' | 'employee';
  department: 'IT' | 'Virtual Assistant' | 'Sales';
  joiningDate: string;
  password: string;
};

const initialFormState: EmployeeFormState = {
  id: '',
  firstName: '',
  lastName: '',
  employeeId: '',
  role: 'employee',
  department: 'IT',
  joiningDate: '',
  password: ''
};

const generateEmployeeId = (firstName: string, lastName: string): string => {
  if (!firstName.trim()) return '';
  const fullName = (firstName.trim() + lastName.trim()).replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = fullName.padEnd(4, 'X').substring(0, 4);
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${randomNum}`;
};

const generatePassword = (firstName: string, lastName: string): string => {
  if (!firstName.trim()) return 'Temp123';
  const cleanName = `${firstName.trim()}${lastName.trim()}`.replace(/\s+/g, '').toLowerCase();
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

  const handleLogoClick = () => {
    console.log('Logo clicked in admin panel');
    // Close any open modals
    setIsModalOpen(false);
    // Reset form state
    setFormState(initialFormState);
    // Clear any selections
    setSelectedEmployeeIds([]);
    // Clear any status messages
    setStatusMessage('');
    // Navigate back to home page
    router.push('/');
  };

  const loadEmployees = useCallback(async () => {
    try {
      console.log('Fetching employee accounts...');
      const accounts = await getAllAccounts();
      console.log('Fetched accounts:', accounts);
      setEmployees(accounts);
      
      // Log the first employee's joining date for debugging
      if (accounts.length > 0) {
        console.log('First employee data:', {
          name: accounts[0].name,
          joiningDate: accounts[0].joiningDate,
          formattedDate: formatDate(accounts[0].joiningDate || '')
        });
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setStatusMessage('Failed to load employees.');
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.push('/');
    } else if (!loading && user?.role === 'admin') {
      // Load employees asynchronously to avoid setState in effect
      const loadEmployeesAsync = async () => {
        try {
          const accounts = await getAllAccounts();
          setEmployees(accounts);
        } catch (error) {
          console.error('Failed to load employees:', error);
        }
      };
      loadEmployeesAsync();
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
      password: generatePassword('', '')
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: MockAccount) => {
    // Split name if firstName/lastName not available (backward compatibility)
    const nameParts = account.name.split(' ');
    const fName = account.firstName || nameParts[0] || '';
    const lName = account.lastName || nameParts.slice(1).join(' ') || '';

    setFormState({
      id: account.id,
      firstName: fName,
      lastName: lName,
      employeeId: account.employeeId,
      role: account.role,
      department: account.department || 'IT',
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
      if ((name === 'firstName' || name === 'lastName') && (isNewEmployee || !prev.employeeId)) {
        newState.employeeId = generateEmployeeId(newState.firstName, newState.lastName);
        newState.password = generatePassword(newState.firstName, newState.lastName);
      }

      return newState;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.firstName.trim() || !formState.employeeId.trim()) {
      setStatusMessage('First Name and Employee ID are required.');
      return;
    }

    const fullName = `${formState.firstName.trim()} ${formState.lastName.trim()}`.trim();

    const account: MockAccount = {
      id: formState.id || `${Date.now()}`,
      employeeId: formState.employeeId.trim(),
      name: fullName,
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      role: formState.role,
      department: formState.department,
      joiningDate: formState.joiningDate,
      password: formState.password || 'Temp@1234'
    };

    try {
      await upsertCustomAccount(account);
      await loadEmployees();
      setStatusMessage(`Saved ${account.name}.`);
      closeModal();
    } catch (error) {
      console.error('Error saving employee:', error);
      setStatusMessage('Failed to save employee. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (selectedEmployeeIds.length === 0) return;

    // Get the names of employees to be deleted for the confirmation message
    const employeesToDelete = employees.filter(emp =>
      selectedEmployeeIds.includes(emp.employeeId)
    );
    const employeeNames = employeesToDelete.map(emp => emp.name).join(', ');

    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to delete the following employee(s):\n\n${employeeNames}\n\nThis action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        // Get the actual account IDs from the employees array
        const accountIdsToDelete = employees
          .filter(emp => selectedEmployeeIds.includes(emp.employeeId))
          .map(emp => emp.id);

        await removeCustomAccounts(accountIdsToDelete);
        setSelectedEmployeeIds([]);
        await loadEmployees();
        setStatusMessage(`Successfully removed ${selectedEmployeeIds.length} employee(s).`);
      } catch (error) {
        console.error('Error deleting employees:', error);
        setStatusMessage('Failed to delete employees. Please try again.');
      }
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
    <Layout onLogoClick={handleLogoClick}>
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
        <div className="">
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
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedEmployeeIds.length === 0
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
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
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
                      <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide w-32 text-center">Department</span>
                      <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide w-32 text-center">Join Date</span>
                      <span className="w-20 text-center">
                        <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Actions</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {employees.map(account => (
                    <div key={account.employeeId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${account.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {account.role === 'admin' ? 'Administrator' : 'Employee'}
                        </span>
                        <span className="text-sm text-gray-600 w-32 text-center">{account.department || 'IT'}</span>
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

        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-4">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <form onSubmit={handleSubmit}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {formState.id ? 'Edit Employee' : 'Create Employee'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formState.firstName}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formState.lastName}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formState.department}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="IT">IT</option>
                  <option value="Virtual Assistant">Virtual Assistant</option>
                  <option value="Sales">Sales</option>
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
                  onClick={() => setFormState(prev => ({ ...prev, password: generatePassword(prev.firstName, prev.lastName) }))}
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
    </Layout>
  );
}
