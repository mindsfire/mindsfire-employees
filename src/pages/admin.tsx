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
    // Get the actual account IDs from the employees array
    const accountIdsToDelete = employees
      .filter(emp => selectedEmployeeIds.includes(emp.employeeId))
      .map(emp => emp.id);
    removeCustomAccounts(accountIdsToDelete);
    setSelectedEmployeeIds([]);
    loadEmployees();
    setStatusMessage(`Removed ${selectedEmployeeIds.length} employee(s).`);
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
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.title}>Employee Attendance Admin Dashboard,</p>
          </div>
          <div style={styles.headerActions}>
            <span style={styles.greeting}>Hi {user.name.split(' ')[0]}</span>
            <button style={styles.linkButton} onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        {statusMessage && <p style={styles.status}>{statusMessage}</p>}

        <div style={styles.toolbarRow}>
          <div />
          <div style={styles.actionButtons}>
            <button style={styles.primaryButton} onClick={openCreateModal}>
              Create Employee
            </button>
            <button
              style={{ ...styles.secondaryButton, opacity: selectedEmployeeIds.length ? 1 : 0.4 }}
              disabled={selectedEmployeeIds.length === 0}
              onClick={handleDelete}
            >
              Delete Employee
            </button>
          </div>
        </div>

        <section style={styles.tableCard}>
          <div style={styles.tableHeaderRow}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
              <span>Employees</span>
            </label>
            <span style={styles.joinedCol}>Joined Date</span>
            <span style={styles.actionCol}>
              <span style={{ visibility: 'hidden' }}>edit</span>
            </span>
          </div>

          <div>
            {employees.map(account => (
              <div key={account.employeeId} style={styles.employeeRow}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.includes(account.employeeId)}
                    onChange={() => toggleSelection(account.employeeId)}
                  />
                  <span>{account.name}</span>
                </label>
                <span style={styles.joinedCol}>{formatDate(account.joiningDate || '')}</span>
                <span style={styles.actionCol}>
                  <button style={styles.editButton} onClick={() => openEditModal(account)}>
                    edit
                  </button>
                </span>
              </div>
            ))}
            {employees.length === 0 && <p style={styles.emptyState}>No employees found.</p>}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <form onSubmit={handleSubmit}>
              <h3 style={{ marginTop: 0 }}>{formState.id ? 'Edit Employee' : 'Create Employee'}</h3>
              <label style={styles.formLabel}>
                Name
                <input
                  style={styles.formInput}
                  name="name"
                  value={formState.name}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label style={styles.formLabel}>
                Employee ID
                <input
                  style={styles.formInput}
                  name="employeeId"
                  value={formState.employeeId}
                  onChange={handleFormChange}
                  required
                  placeholder="Auto-generated from name"
                />
              </label>
              <label style={styles.formLabel}>
                Joining Date
                <input
                  style={styles.formInput}
                  type="date"
                  name="joiningDate"
                  value={formState.joiningDate}
                  onChange={handleFormChange}
                />
              </label>
              <label style={styles.formLabel}>
                Role
                <select
                  style={styles.formInput}
                  name="role"
                  value={formState.role}
                  onChange={handleFormChange}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label style={styles.formLabel}>
                Temporary Password
                <input
                  style={styles.formInput}
                  name="password"
                  value={formState.password}
                  onChange={handleFormChange}
                  placeholder="Auto-generated"
                />
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    padding: '6px 12px',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}
                  onClick={() => setFormState(prev => ({ ...prev, password: generatePassword(prev.name) }))}
                >
                  Regenerate Password
                </button>
              </label>

              <div style={styles.modalActions}>
                <button type="submit" style={styles.primaryButton}>
                  Save
                </button>
                <button type="button" style={styles.cancelButton} onClick={closeModal}>
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

const themeColor = '#4a7ed4';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f7fbff',
    padding: '24px',
    fontFamily: '"Segoe UI", sans-serif',
    color: themeColor
  },
  shell: {
    maxWidth: 960,
    margin: '0 auto',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '24px 32px',
    boxShadow: '0 10px 30px rgba(74, 126, 212, 0.15)',
    border: '2px solid #b9cff3'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 20,
    margin: 0,
    fontWeight: 500
  },
  headerActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },
  greeting: {
    fontWeight: 500
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: themeColor,
    cursor: 'pointer',
    fontWeight: 600
  },
  toolbarRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  actionButtons: {
    display: 'flex',
    gap: 12
  },
  primaryButton: {
    padding: '10px 18px',
    borderRadius: 24,
    border: '2px solid ' + themeColor,
    backgroundColor: '#fff',
    color: themeColor,
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryButton: {
    padding: '10px 18px',
    borderRadius: 24,
    border: '2px solid ' + themeColor,
    backgroundColor: '#eef5ff',
    color: themeColor,
    fontWeight: 600,
    cursor: 'pointer'
  },
  tableCard: {
    border: '2px solid #b9cff3',
    borderRadius: 24,
    padding: '16px 24px'
  },
  tableHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    padding: '8px 0',
    borderBottom: '1px solid #d1e0fa'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  joinedCol: {
    flexBasis: 140,
    textAlign: 'center'
  },
  actionCol: {
    width: 80,
    textAlign: 'right'
  },
  employeeRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #eef5ff'
  },
  editButton: {
    padding: '6px 16px',
    borderRadius: 16,
    border: '1px solid ' + themeColor,
    backgroundColor: '#fff',
    color: themeColor,
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    margin: '24px 0',
    color: '#7e9fd9'
  },
  status: {
    color: '#7e9fd9',
    marginTop: 0
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalCard: {
    backgroundColor: '#f0f6ff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    border: '2px solid #b9cff3'
  },
  formLabel: {
    display: 'block',
    marginBottom: 12,
    fontWeight: 600
  },
  formInput: {
    width: '100%',
    marginTop: 4,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #93b5f4',
    fontSize: 14
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24
  },
  cancelButton: {
    padding: '10px 18px',
    borderRadius: 24,
    border: '2px solid #f59f9f',
    backgroundColor: '#fff0f0',
    color: '#d25050',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
