import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import StatsCards from '../components/StatsCards';

export type AttendanceRecord = {
  id: string;
  name: string;
  loginTime: Date;
  logoutTime: Date | null;
};

const OFFICE_START_HOUR = 10; // 10:00 AM
const OFFICE_END_HOUR = 19;   // 07:00 PM
const GRACE_PERIOD_MINUTES = 0;
const RETENTION_DAYS = 90;

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusStyle = (status: string) => {
    const baseStyle = {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600' as const,
      display: 'inline-block',
      marginRight: '4px',
      marginBottom: '4px',
    };

    switch (status) {
      case 'Late':
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#991b1b' };
      case 'Early Leave':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
      case 'Ok Entry':
      case 'Ok Exit':
        return { ...baseStyle, backgroundColor: '#d1fae5', color: '#065f46' };
      case 'Early Entry':
        return { ...baseStyle, backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'Overtime':
        return { ...baseStyle, backgroundColor: '#e9d5ff', color: '#6b21a8' };
      case 'On Time':
        return { ...baseStyle, backgroundColor: '#d1fae5', color: '#065f46' };
      case 'In Progress':
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
      case 'Invalid Time':
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' };
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  return <span style={getStatusStyle(status)}>{status}</span>;
};

const getStatus = (loginTime: Date, logoutTime: Date | null): string[] => {
  if (!loginTime || !(loginTime instanceof Date) || isNaN(loginTime.getTime())) {
    return ['Invalid Time'];
  }

  const loginHour = loginTime.getHours();
  const loginMinute = loginTime.getMinutes();

  let status: string[] = [];

  // Entry Logic
  if (loginHour < OFFICE_START_HOUR) {
    status.push('Early Entry');
  } else if (loginHour === OFFICE_START_HOUR && loginMinute <= GRACE_PERIOD_MINUTES) {
    status.push('Ok Entry');
  } else {
    status.push('Late');
  }

  // Exit Logic
  if (logoutTime) {
    const logoutHour = logoutTime.getHours();
    const logoutMinute = logoutTime.getMinutes();

    if (logoutHour < OFFICE_END_HOUR) {
      status.push('Early Leave');
    } else if (logoutHour === OFFICE_END_HOUR && logoutMinute <= GRACE_PERIOD_MINUTES) {
      status.push('Ok Exit');
    } else {
      status.push('Overtime');
    }
  }

  if (status.length === 0 && logoutTime) {
    return ['On Time']; // Fallback
  }

  if (status.length === 0) {
    return ['In Progress'];
  }

  return status;
};

type ComplianceWarning = {
  type: 'unclosed_session' | 'excessive_late' | 'excessive_early_leave';
  message: string;
};

const checkAttendanceCompliance = (userRecords: AttendanceRecord[], userName: string): ComplianceWarning[] => {
  const warnings: ComplianceWarning[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Check for unclosed sessions from previous days
  const unclosedOldSessions = userRecords.filter(record => {
    if (record.logoutTime) return false;
    const recordDate = new Date(record.loginTime);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate < today;
  });

  if (unclosedOldSessions.length > 0) {
    const oldestSession = unclosedOldSessions[0];
    const sessionDate = oldestSession.loginTime.toLocaleDateString();
    warnings.push({
      type: 'unclosed_session',
      message: `Hi ${userName}, you have an unclosed session from ${sessionDate}. Please ensure you clock out daily.`
    });
  }

  // Check for excessive late entries in the last 7 days
  const recentRecords = userRecords.filter(record => record.loginTime >= sevenDaysAgo);
  const lateCount = recentRecords.filter(record => {
    const statuses = getStatus(record.loginTime, record.logoutTime);
    return statuses.includes('Late');
  }).length;

  if (lateCount >= 3) {
    warnings.push({
      type: 'excessive_late',
      message: `Hi ${userName}, you have been late ${lateCount} times in the last week. Please maintain punctuality.`
    });
  }

  // Check for excessive early leaves in the last 7 days
  const earlyLeaveCount = recentRecords.filter(record => {
    const statuses = getStatus(record.loginTime, record.logoutTime);
    return statuses.includes('Early Leave');
  }).length;

  if (earlyLeaveCount >= 3) {
    warnings.push({
      type: 'excessive_early_leave',
      message: `Hi ${userName}, you have left early ${earlyLeaveCount} times in the last week. Please complete your work hours.`
    });
  }

  return warnings;
};

// Warning Banner Component
const WarningBanner = ({ warnings, onDismiss }: { warnings: ComplianceWarning[], onDismiss: () => void }) => {
  if (warnings.length === 0) return null;

  return (
    <div style={{
      margin: '20px 0',
      padding: '16px',
      backgroundColor: '#fff3cd',
      color: '#856404',
      borderRadius: '8px',
      border: '1px solid #ffc107',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
            ⚠️ Attendance Compliance Warning
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {warnings.map((warning, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>{warning.message}</li>
            ))}
          </ul>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#856404',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '0 8px',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [complianceWarnings, setComplianceWarnings] = useState<ComplianceWarning[]>([]);

  // Use logged-in user's name
  const userName = user?.name || '';

  // Redirect when auth status changes
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);



  // Load records from localStorage on component mount
  useEffect(() => {
    const loadRecords = () => {
      try {
        const savedRecords = localStorage.getItem('attendanceRecords');
        if (savedRecords) {
          const parsedRecords = JSON.parse(savedRecords);
          if (!Array.isArray(parsedRecords)) {
            console.error('Parsed records is not an array:', parsedRecords);
            setRecords([]);
            return;
          }
          const formattedRecords = parsedRecords.map((record: any) => ({
            ...record,
            loginTime: new Date(record.loginTime),
            logoutTime: record.logoutTime ? new Date(record.logoutTime) : null
          }));

          // Check for active session
          const activeSession = formattedRecords.find((r: any) => !r.logoutTime);
          if (activeSession) {
            setCurrentSessionId(activeSession.id);
          }

          // Apply Retention Policy
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

          const validRecords = formattedRecords.filter((record: AttendanceRecord) => {
            return record.loginTime > cutoffDate;
          });

          if (validRecords.length !== formattedRecords.length) {
            console.log(`Cleaned up ${formattedRecords.length - validRecords.length} old records.`);
            setRecords(validRecords);
            localStorage.setItem('attendanceRecords', JSON.stringify(validRecords));
          } else {
            setRecords(formattedRecords);
          }
        }
      } catch (error) {
        console.error('Error loading records:', error);
        setError('Failed to load attendance records. Some data might be corrupted.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, []);

  // Check attendance compliance when records change
  useEffect(() => {
    if (userName && records.length > 0) {
      const userRecords = records.filter(record => record.name === userName);
      const warnings = checkAttendanceCompliance(userRecords, userName);
      setComplianceWarnings(warnings);
    }
  }, [records, userName]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Render nothing while redirecting
  }

  const saveRecords = (updatedRecords: AttendanceRecord[]) => {
    try {
      localStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));
      return updatedRecords;
    } catch (storageError) {
      console.error('Failed to save to localStorage:', storageError);
      setError('Failed to save attendance. Your data might not be saved.');
      return records; // Return previous records if save fails
    }
  };

  const handleClockIn = () => {
    setError(null);

    if (!userName.trim()) {
      setError('User name not available');
      return;
    }

    if (currentSessionId) {
      setError('You are already clocked in!');
      return;
    }

    try {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        name: userName.trim(),
        loginTime: new Date(),
        logoutTime: null
      };

      setRecords(prevRecords => saveRecords([...prevRecords, newRecord]));
      setCurrentSessionId(newRecord.id);
    } catch (error) {
      console.error('Error during clock in:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleClockOut = () => {
    setError(null);

    if (!currentSessionId) {
      setError('You are not currently clocked in!');
      return;
    }

    try {
      setRecords(prevRecords => {
        const updatedRecords = prevRecords.map(record =>
          record.id === currentSessionId
            ? { ...record, logoutTime: new Date() }
            : record
        );
        return saveRecords(updatedRecords);
      });

      setCurrentSessionId(null);
    } catch (error) {
      console.error('Error during clock out:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  // Single toggle function for clock in/out
  const handleClockToggle = () => {
    if (currentSessionId) {
      handleClockOut();
    } else {
      handleClockIn();
    }
  };

  const clearAllData = () => {
    if (window.confirm('⚠️ WARNING: This will delete ALL attendance records. Are you sure?')) {
      try {
        localStorage.removeItem('attendanceRecords');
        setRecords([]);
        setCurrentSessionId(null);
        setError('All attendance records have been cleared.');
        // Clear the error after 3 seconds
        setTimeout(() => setError(null), 3000);
      } catch (error) {
        console.error('Error clearing data:', error);
        setError('Failed to clear attendance records.');
      }
    }
  };

  // Filter records for current user only
  const userRecords = records.filter(record => record.name === userName);

  const exportToCSV = () => {
    try {
      if (records.length === 0) {
        setError('No records to export');
        return;
      }

      // Create CSV header
      let csvContent = 'Name,Login Time,Logout Time,Duration\n';

      // Add each record as a row in the CSV
      records.forEach(record => {
        const loginTime = formatDate(record.loginTime);
        const logoutTime = formatDate(record.logoutTime);
        const duration = calculateDuration(record.loginTime, record.logoutTime);

        // Escape any commas in the data and add quotes
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

        csvContent += [
          escapeCsv(record.name),
          escapeCsv(loginTime),
          escapeCsv(logoutTime),
          escapeCsv(duration)
        ].join(',') + '\n';
      });

      // Create a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export attendance records.');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'In Progress';
    return date.toLocaleString();
  };

  const calculateDuration = (start: Date, end: Date | null) => {
    if (!end) return 'In Progress';
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const calculateTotalHours = (recordsToCalculate: AttendanceRecord[]) => {
    return recordsToCalculate.reduce((total, record) => {
      if (record.logoutTime) {
        const diff = record.logoutTime.getTime() - record.loginTime.getTime();
        return total + diff;
      }
      return total;
    }, 0);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading attendance records...</div>
      </div>
    );
  }


  return (
    <div>
      {/* Error Display */}
      {error && (
        <div style={{
          margin: '10px 0',
          padding: '10px',
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          borderRadius: '4px',
          border: '1px solid #ef9a9a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#d32f2f',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Compliance Warning Display */}
      <WarningBanner
        warnings={complianceWarnings}
        onDismiss={() => setComplianceWarnings([])}
      />

      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <h2 style={{ marginTop: '0', color: '#333' }}>Hi {userName}</h2>
        <div style={{ marginBottom: '16px', color: '#666' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Office Hours:</strong> 10:00 AM - 07:00 PM
          </p>
          <p style={{ margin: 0 }}>
            {currentSessionId ? 'You are currently clocked in' : 'You are not clocked in'}
          </p>
        </div>
        <button
          onClick={handleClockToggle}
          style={{
            padding: '12px 24px',
            backgroundColor: currentSessionId ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {currentSessionId ? 'Clock Out' : 'Clock In'}
        </button>
      </div>

      {/* Stats Cards */}
      <StatsCards
        records={records}
        currentSessionId={currentSessionId}
        userName={userName}
      />

      <div style={{ marginTop: '40px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2>Attendance Records</h2>
            <button
              onClick={exportToCSV}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>📥</span> Export to CSV
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <p>No records found</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Login Time</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Logout Time</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Duration</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((record) => (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid #ddd',
                      backgroundColor: record.id === currentSessionId ? '#e8f5e9' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(record.loginTime)}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(record.logoutTime)}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {calculateDuration(record.loginTime, record.logoutTime)}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {getStatus(record.loginTime, record.logoutTime).map((status, idx) => (
                        <StatusBadge key={idx} status={status} />
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
