import { useState, useEffect } from 'react';

type AttendanceRecord = {
  id: string;
  name: string;
  loginTime: Date;
  logoutTime: Date | null;
};

export default function Home() {
  const [name, setName] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load records from localStorage on component mount
  useEffect(() => {
    const loadRecords = () => {
      try {
        const savedRecords = localStorage.getItem('attendanceRecords');
        if (savedRecords) {
          const parsedRecords = JSON.parse(savedRecords);
          const formattedRecords = parsedRecords.map((record: any) => ({
            ...record,
            loginTime: new Date(record.loginTime),
            logoutTime: record.logoutTime ? new Date(record.logoutTime) : null
          }));
          
          setRecords(formattedRecords);
          
          // Check for active session
          const activeSession = formattedRecords.find((r: any) => !r.logoutTime);
          if (activeSession) {
            setCurrentSessionId(activeSession.id);
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
    
    // Validate input
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (currentSessionId) {
      setError('You are already clocked in!');
      return;
    }

    try {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        name: name.trim(),
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
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Employee Attendance Logger</h1>
      
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

      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ddd' }}>
        <h2>{currentSessionId ? 'Clock Out' : 'Clock In'}</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            const { value } = e.target;
            if (value.length <= 50) {  // Prevent very long names
              setName(value);
            }
          }}
          placeholder="Enter your name"
          disabled={!!currentSessionId}
          style={{ 
            padding: '8px', 
            marginRight: '10px', 
            width: '200px',
            border: error && !name.trim() ? '1px solid #d32f2f' : '1px solid #ccc'
          }}
        />
        {currentSessionId ? (
          <button 
            onClick={handleClockOut}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Clock Out
          </button>
        ) : (
          <button 
            onClick={handleClockIn}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Clock In
          </button>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Attendance Records</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
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
            <button 
              onClick={clearAllData}
              style={{ 
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🗑️</span> Clear All
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
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Login Time</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Logout Time</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Duration</th>
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
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{record.name}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(record.loginTime)}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(record.logoutTime)}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      {calculateDuration(record.loginTime, record.logoutTime)}
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
