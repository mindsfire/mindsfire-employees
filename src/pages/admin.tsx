import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '../utils/supabase/client';
import { generateAttendanceAlerts, AttendanceAlert, AttendanceRecord } from '../utils/attendanceAlerts';
import { startOfDay, endOfDay } from '../utils/dateUtils';
import {
  MockAccount,
  getAllAccounts,
  removeCustomAccounts,
  useAuth
} from '../contexts/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';
import AttendanceAudit from '../components/admin/AttendanceAudit';

interface AttendanceLogJoin {
  id: string;
  email: string;
  login_time: string;
  logout_time: string | null;
  employees: { full_name: string } | null;
}

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

const supabase = createClient();

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
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'employees' | 'audit'>('employees');

  // Alert System State
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const accounts = await getAllAccounts();
      setEmployees(accounts);
    } catch (error) {
      console.error('Error loading employees:', error);
      setStatusMessage('Failed to load employees.');
    }
  }, []);

  const loadAttendanceAlerts = useCallback(async () => {
    setIsLoadingAlerts(true);
    try {
      const today = startOfDay();
      const tomorrow = endOfDay(new Date()); // Get end of current day to cover full range

      // 1. Fetch today's logs
      const { data: logs, error } = await supabase
        .schema('attendance')
        .from('attendance_logs')
        .select(`
          id,
          email,
          login_time,
          logout_time,
          employees ( full_name )
        `)
        .gte('login_time', today.toISOString())
        .lte('login_time', tomorrow.toISOString());

      if (error) throw error;

      if (logs) {
        // 2. Map to AttendanceRecord format
        const records: AttendanceRecord[] = (logs as unknown as AttendanceLogJoin[]).map((log) => ({
          id: log.id,
          name: log.employees?.full_name || log.email,
          email: log.email,
          loginTime: new Date(log.login_time),
          logoutTime: log.logout_time ? new Date(log.logout_time) : null
        }));

        // 3. Generate alerts
        const generatedAlerts = generateAttendanceAlerts(records);
        setAlerts(generatedAlerts);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.push('/');
    } else if (!loading && user?.role === 'admin') {
      loadEmployees();
      loadAttendanceAlerts();
    }
  }, [user, loading, router, loadEmployees, loadAttendanceAlerts]);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.firstName.trim() || !formState.email.trim()) {
      setStatusMessage('First Name and Email are required.');
      return;
    }

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
      setSuccessModalMessage(`Successfully saved ${fullName}.`);
      closeModal(); // Close form modal
      setIsSuccessModalOpen(true); // Open success modal
    } catch (error: unknown) {
      console.error('Error saving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(`Failed: ${errorMessage}`);
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
      await loadEmployees();
      setSuccessModalMessage(`Successfully removed ${selectedEmails.length} employees.`);
      setIsDeleteModalOpen(false);
      setIsSuccessModalOpen(true);
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
            <div className="flex items-center space-x-6">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setIsAlertOpen(!isAlertOpen)}
                  className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">View notifications</span>
                  {/* Bell Icon */}
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Red Badge */}
                  {alerts.length > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 ring-2 ring-white text-xs font-bold text-white flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </button>

                {/* Dropdown Panel */}
                {isAlertOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 max-h-96 overflow-y-auto">
                    {isLoadingAlerts ? (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        <span className="inline-block animate-pulse">Checking for alerts...</span>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        </div>
                        {alerts.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">No new alerts</div>
                        ) : (
                          alerts.map((alert) => (
                            <div key={alert.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                              <div className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5">
                                  {alert.type === 'LATE_ARRIVAL' && <span className="text-yellow-600">⚠️</span>}
                                  {alert.type === 'EARLY_DEPARTURE' && <span className="text-orange-600">🏃</span>}
                                  {alert.type === 'UNDERTIME' && <span className="text-red-600">📉</span>}
                                </div>
                                <div className="ml-3 w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900">{alert.employeeName}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{alert.message.replace(`${alert.employeeName} `, '').replace(alert.employeeName, '')}</p>
                                  <p className="text-xs text-gray-400 mt-1">{alert.date === new Date().toISOString().split('T')[0] ? 'Today' : alert.date}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center border-l pl-6 border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
                <div className="text-xs text-gray-500">Total Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('employees')}
              className={`${activeTab === 'employees'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Employees
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`${activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Attendance Audit
            </button>
          </nav>
        </div>

        {activeTab === 'audit' ? (
          <AttendanceAudit employees={employees} />
        ) : (
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
        )}
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
        isOpen={isSuccessModalOpen}
        title="Success"
        message={successModalMessage}
        confirmText="OK"
        cancelText={null}
        isDangerous={false}
        onConfirm={() => setIsSuccessModalOpen(false)}
        onCancel={() => setIsSuccessModalOpen(false)}
      />
    </>
  );
}
