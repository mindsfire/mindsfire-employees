import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  MockAccount,
  getAllAccounts,
  removeCustomAccounts,
  useAuth
} from '../contexts/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';

type EmployeeFormState = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'employee';
  department: 'IT' | 'Virtual Assistant' | 'Sales';
  joiningDate: string;
  password: string;
};

const initialFormState: EmployeeFormState = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'employee',
  department: 'IT',
  joiningDate: '',
  password: ''
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
  const { user, loading } = useAuth();

  const [employees, setEmployees] = useState<MockAccount[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false); // This is the Form Modal (Add/Edit)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogoClick = () => {
    setIsModalOpen(false);
    setFormState(initialFormState);
    setSelectedEmails([]);
    setStatusMessage('');
    router.push('/');
  };

  const loadEmployees = useCallback(async () => {
    try {
      const accounts = await getAllAccounts();
      setEmployees(accounts);
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
      loadEmployees();
    }
  }, [user, loading, router, loadEmployees]);

  const allVisibleSelected = useMemo(
    () => employees.length > 0 && selectedEmails.length === employees.length,
    [employees, selectedEmails]
  );

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedEmails([]);
    } else {
      // Use EMAIL as the unique key
      setSelectedEmails(employees.map(emp => emp.email || '').filter(e => e));
    }
  };

  const toggleSelection = (email: string) => {
    if (!email) return;
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const openCreateModal = () => {
    setFormState({
      ...initialFormState,
      password: generatePassword('', '')
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: MockAccount) => {
    const nameParts = account.name.split(' ');
    const fName = account.firstName || nameParts[0] || '';
    const lName = account.lastName || nameParts.slice(1).join(' ') || '';

    setFormState({
      id: account.id,
      firstName: fName,
      lastName: lName,
      email: account.email || '',
      role: account.role,
      department: account.department as 'IT' | 'Virtual Assistant' | 'Sales' || 'IT',
      joiningDate: account.joiningDate || '',
      password: '' // No longer stored/shown for existing users
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormState(initialFormState);
    setIsSubmitting(false);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState(prev => {
      const newState = { ...prev, [name]: value };

      // Auto-generate password for new users when name fields change
      if (!prev.id && (name === 'firstName' || name === 'lastName')) {
        // Use the updated values from newState
        newState.password = generatePassword(newState.firstName, newState.lastName);
      }

      // If manually changing password field (only for NEW user), keep the manual value
      if (name === 'password' && !prev.id) {
        newState.password = value;
      }

      return newState;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.firstName.trim() || !formState.email.trim()) {
      setStatusMessage('First Name and Email are required.');
      return;
    }
    // Open the confirmation modal instead of submitting directly
    setIsSaveModalOpen(true);
  };

  const confirmSave = async () => {
    setIsSubmitting(true);
    setStatusMessage('Saving...');
    const fullName = `${formState.firstName.trim()} ${formState.lastName.trim()}`.trim();

    try {
      const response = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formState.email.trim(),
          password: formState.password,
          fullName,
          role: formState.role,
          department: formState.department,
        })
      });

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        throw new Error(`Server returned unexpected format: ${text.slice(0, 100)}...`);
      }

      if (!response.ok) throw new Error(data.message || 'Failed to create');

      await loadEmployees();
      setStatusMessage(`Successfully saved ${fullName}.`);
      setIsSaveModalOpen(false); // Close confirmation modal
      closeModal(); // Close form modal
    } catch (error: unknown) {
      console.error('Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(`Failed: ${errorMessage}`);
      setIsSaveModalOpen(false); // Close confirmation on error so they can try again or fix
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (selectedEmails.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await removeCustomAccounts(selectedEmails);
      setSelectedEmails([]);
      await loadEmployees();
      setStatusMessage(`Removed ${selectedEmails.length} employees.`);
    } catch (error) {
      console.error('Delete error:', error);
      setStatusMessage('Failed to delete.');
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user || user.role !== 'admin') return <div>Access denied.</div>;

  return (
    <>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
              <p className="text-sm text-gray-600 mt-1">Manage system users by Email</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div>
          {statusMessage && (
            <div className={`mb-4 p-4 border rounded-md ${statusMessage.startsWith('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              <p className="text-sm">{statusMessage}</p>
            </div>
          )}

          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <button onClick={openCreateModal} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
              Add New Employee
            </button>
            <button
              onClick={handleDelete}
              disabled={selectedEmails.length === 0}
              className={`px-4 py-2 text-white rounded-md ${selectedEmails.length === 0 ? 'bg-gray-300' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Remove Selected
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between">
                <label className="flex items-center">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="rounded text-emerald-600" />
                  <span className="ml-3 text-sm font-semibold uppercase">User</span>
                </label>
                <div className="flex space-x-8">
                  <span className="w-40 text-center text-sm font-semibold uppercase">Email</span>
                  <span className="w-32 text-center text-sm font-semibold uppercase">Role</span>
                  <span className="w-32 text-center text-sm font-semibold uppercase">Joined</span>
                  <span className="w-20 text-center text-sm font-semibold uppercase">Actions</span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {employees.map(account => (
                  <div key={account.email || account.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <label className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={!!account.email && selectedEmails.includes(account.email)}
                        onChange={() => account.email && toggleSelection(account.email)}
                        className="rounded text-emerald-600"
                      />
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{account.name}</div>
                      </div>
                    </label>
                    <div className="flex space-x-8 items-center">
                      <span className="w-40 text-center text-sm text-gray-500 truncate" title={account.email}>{account.email}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-32 text-center ${account.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}`}>
                        {account.role}
                      </span>
                      <span className="w-32 text-center text-sm text-gray-500">{formatDate(account.joiningDate || '')}</span>
                      <div className="w-20 text-center">
                        <button onClick={() => openEditModal(account)} className="text-emerald-600 hover:text-emerald-900 text-sm font-medium">Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 px-4">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <form onSubmit={handleSubmit}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{formState.id ? 'Edit User' : 'New User'}</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input name="firstName" value={formState.firstName} onChange={handleFormChange} required className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input name="lastName" value={formState.lastName} onChange={handleFormChange} className="w-full border rounded p-2" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formState.email} onChange={handleFormChange} required className="w-full border rounded p-2" />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select name="role" value={formState.role} onChange={handleFormChange} className="w-full border rounded p-2">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {formState.id ? 'Password' : 'Password'}
                </label>
                {!formState.id ? (
                  <>
                    <input
                      name="password"
                      value={formState.password}
                      onChange={handleFormChange}
                      placeholder="Auto-generated"
                      className="w-full border rounded p-2 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-generated for Supabase login. Share this with the employee.</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded border border-dashed text-center">
                    Passwords are not recoverable once saved for security reasons.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Save' : 'Save'}
                </button>
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Employees"
        message={`Are you sure you want to delete ${selectedEmails.length} selected employee(s)?\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isSaveModalOpen}
        title="Save Employee"
        message={`Are you sure you want to save the details for ${formState.firstName} ${formState.lastName}?`}
        confirmText="Save"
        cancelText="Edit"
        isDangerous={false}
        onConfirm={confirmSave}
        onCancel={() => setIsSaveModalOpen(false)}
      />
    </>
  );
}
