import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { SectionCards } from '@/components/section-cards';
import { AttendanceDataTable } from '@/components/attendance-data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '../utils/supabase/client';
import { startOfDay, endOfDay, daysAgo, startOfMonth } from '../utils/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Table2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type AttendanceRecord = {
  id: string;
  name: string;
  email: string;
  loginTime: Date;
  logoutTime: Date | null;
};

const supabase = createClient();

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
      case 'Good Entry':
      case 'Good Exit':
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

  const status: string[] = [];

  // Entry Logic
  // Before 9:30 AM = Early Entry
  // 9:30 AM - 10:00 AM = Good Entry
  // After 10:00 AM = Late
  if (loginHour < 9 || (loginHour === 9 && loginMinute < 30)) {
    status.push('Early Entry');
  } else if (loginHour === 9 && loginMinute >= 30) {
    status.push('Good Entry');
  } else if (loginHour === OFFICE_START_HOUR && loginMinute <= GRACE_PERIOD_MINUTES) {
    status.push('Good Entry');
  } else {
    status.push('Late');
  }

  // Exit Logic
  // Before 7:00 PM = Early Leave
  // 7:00 PM - 7:30 PM = Good Exit
  // 7:30 PM - 11:59 PM = Overtime
  if (logoutTime) {
    const logoutHour = logoutTime.getHours();
    const logoutMinute = logoutTime.getMinutes();

    if (logoutHour < OFFICE_END_HOUR) {
      status.push('Early Leave');
    } else if (logoutHour === OFFICE_END_HOUR && logoutMinute <= 30) {
      status.push('Good Exit');
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
  const today = startOfDay();
  const sevenDaysAgo = daysAgo(7, today);

  // Collect all issues
  const issues: string[] = [];

  // Check for unclosed sessions from previous days
  const unclosedOldSessions = userRecords.filter(record => {
    if (record.logoutTime) return false;
    const recordDate = startOfDay(record.loginTime);
    return recordDate < today;
  });

  if (unclosedOldSessions.length > 0) {
    issues.push(`${unclosedOldSessions.length} unclosed session(s)`);
  }

  // Check for excessive late entries in the last 7 days
  const recentRecords = userRecords.filter(record => record.loginTime >= sevenDaysAgo);
  const lateCount = recentRecords.filter(record => {
    const statuses = getStatus(record.loginTime, record.logoutTime);
    return statuses.includes('Late');
  }).length;

  if (lateCount >= 3) {
    issues.push(`late ${lateCount} times this week`);
  }

  // Check for excessive early leaves in the last 7 days
  const earlyLeaveCount = recentRecords.filter(record => {
    const statuses = getStatus(record.loginTime, record.logoutTime);
    return statuses.includes('Early Leave');
  }).length;

  if (earlyLeaveCount >= 3) {
    issues.push(`left early ${earlyLeaveCount} times this week`);
  }

  // Combine all issues into one message
  if (issues.length > 0) {
    const message = `Hi ${userName}, you have ${issues.join(', ')} - please maintain proper attendance.`;
    return [{
      type: 'excessive_late',
      message
    }];
  }

  return [];
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
  const { user, loading } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [complianceWarnings, setComplianceWarnings] = useState<ComplianceWarning[]>([]);
  const [rangeFilter, setRangeFilter] = useState<'last7' | 'month' | 'last3'>('last7');

  // Use logged-in user's name
  const userName = user?.name || '';

  // Redirect when auth status changes
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load records from Supabase on component mount
  useEffect(() => {
    const loadRecords = async () => {
      if (!user) return;

      try {
        let query = supabase
          .schema('attendance')
          .from('attendance_logs')
          .select('*')
          .order('login_time', { ascending: false });

        // Filter by employee for everyone
        query = query.eq('email', user.email);

        const { data, error } = await query;

        if (error) {
          console.error('Error loading records:', error);
          setError('Failed to load attendance records');
          return;
        }

        interface DatabaseRecord {
          id: string;
          email: string;
          login_time: string;
          logout_time: string | null;
        }

        const formattedRecords = (data || []).map((record: DatabaseRecord) => ({
          id: record.id,
          name: userName, // Temporary, will be updated below
          email: record.email, // Store email for proper filtering
          loginTime: new Date(record.login_time),
          logoutTime: record.logout_time ? new Date(record.logout_time) : null
        }));

        // Fetch employee names for all records
        if (formattedRecords.length > 0) {
          try {
            const uniqueEmails = [...new Set(formattedRecords.map((r: AttendanceRecord) => r.email))];
            const { data: employees, error: empError } = await supabase
              .schema('attendance')
              .from('employees')
              .select('email, full_name')
              .in('email', uniqueEmails);

            if (!empError && employees) {
              const employeeMap = employees.reduce((acc: Record<string, string>, emp: { email: string; full_name: string }) => {
                acc[emp.email] = emp.full_name;
                return acc;
              }, {} as Record<string, string>);

              // Update records with actual employee names
              formattedRecords.forEach((record: AttendanceRecord) => {
                record.name = employeeMap[record.email] || 'Unknown Employee';
              });
            }
          } catch (error) {
            console.error('Error fetching employee names:', error);
          }
        }

        // Auto-close unclosed sessions from previous days
        const today = startOfDay();

        let hasAutoClosedSessions = false;
        const autoClosedRecords = formattedRecords.map((record: AttendanceRecord) => {
          // If session is unclosed and from a previous day
          if (!record.logoutTime) {
            const loginDate = startOfDay(record.loginTime);

            if (loginDate < today) {
              // Auto-close at 11:59:59 PM of the login day
              const autoLogoutTime = endOfDay(record.loginTime);
              hasAutoClosedSessions = true;
              return { ...record, logoutTime: autoLogoutTime };
            }
          }
          return record;
        });

        // Check for active session (only from today and not auto-closed)
        const currentToday = startOfDay();

        console.log('All records after auto-close:', autoClosedRecords.map((r: AttendanceRecord) => ({
          id: r.id,
          loginTime: r.loginTime,
          logoutTime: r.logoutTime,
          hasLogout: !!r.logoutTime
        })));

        const activeSession = autoClosedRecords.find((r: AttendanceRecord) => {
          if (!r.logoutTime) {
            const recordDate = startOfDay(r.loginTime);
            const isToday = recordDate.getTime() === currentToday.getTime();

            console.log('Found unclosed session:', {
              id: r.id,
              loginTime: r.loginTime,
              isToday,
              recordDate: recordDate.toDateString(),
              today: currentToday.toDateString()
            });

            return isToday; // Only today's non-auto-closed sessions
          }
          return false;
        });

        console.log('Active session found:', activeSession ? activeSession.id : 'none');

        if (activeSession) {
          setCurrentSessionId(activeSession.id);
        } else {
          setCurrentSessionId(null); // Explicitly clear if no active session
        }

        // Apply Retention Policy
        const cutoffDate = daysAgo(RETENTION_DAYS);

        const validRecords = autoClosedRecords.filter((record: AttendanceRecord) => {
          return record.loginTime > cutoffDate;
        });

        if (validRecords.length !== formattedRecords.length || hasAutoClosedSessions) {
          console.log(`Cleaned up ${formattedRecords.length - validRecords.length} old records.`);
          if (hasAutoClosedSessions) {
            console.log('Auto-closed unclosed sessions from previous days.');
          }
        }

        setRecords(validRecords.sort((a: AttendanceRecord, b: AttendanceRecord) => b.loginTime.getTime() - a.loginTime.getTime()));
      } catch (error) {
        console.error('Error loading records:', error);
        setError('Failed to load attendance records. Some data might be corrupted.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [user, userName]);

  // Check attendance compliance when records change
  useEffect(() => {
    if (userName && records.length > 0) {
      const userRecords = records.filter(record => record.email === user?.email);
      const warnings = checkAttendanceCompliance(userRecords, userName);
      setComplianceWarnings(warnings);
    }
  }, [records, userName, user?.email]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Render nothing while redirecting
  }

  // saveRecords is no longer needed - Supabase handles persistence

  const handleClockIn = async () => {
    setError(null);

    if (!userName.trim() || !user) {
      setError('User information not available');
      return;
    }

    if (currentSessionId) {
      setError('You are already clocked in!');
      return;
    }

    // First-In, Last-Out logic: Check if a record already exists for today
    try {
      const todayStart = startOfDay();
      const tomorrowStart = daysAgo(-1, todayStart);

      const { data: existingRecords, error: fetchError } = await supabase
        .schema('attendance')
        .from('attendance_logs')
        .select('*')
        .eq('email', user.email)
        .gte('login_time', todayStart.toISOString())
        .lt('login_time', tomorrowStart.toISOString())
        .order('login_time', { ascending: true });

      if (fetchError) throw fetchError;

      let resultData;
      if (existingRecords && existingRecords.length > 0) {
        // Reuse the first record of the day - clear logout time to "resume"
        const { data, error: updateError } = await supabase
          .schema('attendance')
          .from('attendance_logs')
          .update({ logout_time: null })
          .eq('id', existingRecords[0].id)
          .select()
          .single();

        if (updateError) throw updateError;
        resultData = data;
        console.log('Resumed existing daily session:', resultData.id);
      } else {
        // Create a fresh record for the day
        const { data, error: insertError } = await supabase
          .schema('attendance')
          .from('attendance_logs')
          .insert([{
            email: user.email,
            login_time: new Date().toISOString(),
            logout_time: null
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        resultData = data;
        console.log('Created new daily session:', resultData.id);
      }

      if (resultData) {
        const updatedRecord: AttendanceRecord = {
          id: resultData.id,
          name: userName,
          email: user.email,
          loginTime: new Date(resultData.login_time),
          logoutTime: resultData.logout_time ? new Date(resultData.logout_time) : null
        };

        setRecords(prevRecords => {
          // Remove if already in list (for reuse case) and add back updated
          const filtered = prevRecords.filter(r => r.id !== updatedRecord.id);
          const updated = [updatedRecord, ...filtered];
          return updated.sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());
        });
        setCurrentSessionId(updatedRecord.id);
      }
    } catch (error) {
      console.error('Clock-in error:', error);
      setError(error instanceof Error ? error.message : 'Failed to clock in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError(null);

    if (!currentSessionId) {
      setError('You are not currently clocked in!');
      return;
    }

    try {
      // Find the session record to get loginTime
      const session = records.find(r => r.id === currentSessionId);
      const now = new Date();

      if (session && now < session.loginTime) {
        setError('Clock-out time cannot be earlier than clock-in time!');
        return;
      }

      const { data, error } = await supabase
        .schema('attendance')
        .from('attendance_logs')
        .update({ logout_time: now.toISOString() })
        .eq('id', currentSessionId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setRecords(prevRecords =>
          prevRecords.map(record =>
            record.id === currentSessionId
              ? { ...record, logoutTime: new Date(data.logout_time) }
              : record
          )
        );
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Error during clock out:', error);
      setError('Failed to clock out. Please try again.');
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


  // Show all records sorted by latest first
  const displayRecords: AttendanceRecord[] = [...records].sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());

  const filteredRecords = displayRecords.filter((record) => {
    if (rangeFilter === 'last7') {
      return record.loginTime >= daysAgo(7);
    }
    if (rangeFilter === 'month') {
      return record.loginTime >= startOfMonth();
    }
    return record.loginTime >= daysAgo(90);
  });

  const exportToCSV = () => {
    try {
      if (filteredRecords.length === 0) {
        setError('No records to export');
        return;
      }

      // Create CSV header
      let csvContent = 'Name,Login Time,Logout Time,Duration\n';

      // Add each record as a row in the CSV
      filteredRecords.forEach(record => {
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

  const exportToPDF = () => {
    try {
      if (filteredRecords.length === 0) {
        setError('No records to export');
        return;
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Attendance Report", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      const tableData = filteredRecords.map(record => [
        record.name,
        formatDate(record.loginTime),
        formatDate(record.logoutTime),
        calculateDuration(record.loginTime, record.logoutTime)
      ]);

      autoTable(doc, {
        head: [['Name', 'Login Time', 'Logout Time', 'Duration']],
        body: tableData,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [50, 50, 50] },
      });

      doc.save(`attendance_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export PDF.');
    }
  };

  const exportToExcel = () => {
    try {
      if (displayRecords.length === 0) {
        setError('No records to export');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(filteredRecords.map(record => ({
        'Name': record.name,
        'Login Time': formatDate(record.loginTime),
        'Logout Time': formatDate(record.logoutTime),
        'Duration': calculateDuration(record.loginTime, record.logoutTime)
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      XLSX.writeFile(workbook, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setError('Failed to export Excel.');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'In Progress';
    return date.toLocaleString();
  };

  const calculateDuration = (start: Date, end: Date | null) => {
    if (!end) return 'In Progress';
    const diff = end.getTime() - start.getTime();
    if (diff < 0) return 'Invalid';
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
        height: 'calc(100vh - 64px)'
      }}>
        <div>Loading attendance records...</div>
      </div>
    );
  }


  return (
    <>
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
      <SectionCards
        records={records}
        currentSessionId={currentSessionId}
        userName={userName}
      />

      <div style={{ marginTop: '40px' }}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Table2 className="h-5 w-5 text-muted-foreground" />
              Attendance Records
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={rangeFilter} onValueChange={(value) => setRangeFilter(value as typeof rangeFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="last3">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                    <FileDown className="h-4 w-4" />
                    Export Data
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <AttendanceDataTable
            data={filteredRecords}
            currentSessionId={currentSessionId}
            formatDate={formatDate}
            calculateDuration={calculateDuration}
            renderStatus={(record) =>
              getStatus(record.loginTime, record.logoutTime).map((status, idx) => (
                <StatusBadge key={idx} status={status} />
              ))
            }
          />
        </div>
      </div>
    </>
  );

}
