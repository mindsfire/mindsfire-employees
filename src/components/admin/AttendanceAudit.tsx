import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../utils/supabase/client';
import { generateAttendanceAlerts, AttendanceRecord, AlertType } from '../../utils/attendanceAlerts';
import { startOfDay, endOfDay, daysAgo } from '../../utils/dateUtils';
import { MockAccount } from '../../contexts/AuthContext';

interface AttendanceAuditProps {
    employees: MockAccount[];
}

interface ExpandedAttendanceRecord extends AttendanceRecord {
    alerts: AlertType[];
    duration: number; // in hours
}

const supabase = createClient();

export default function AttendanceAudit({ employees }: AttendanceAuditProps) {
    const [startDate, setStartDate] = useState(daysAgo(30).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<AlertType | 'ALL'>('ALL');

    const [logs, setLogs] = useState<ExpandedAttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Build query
            let query = supabase
                .schema('attendance')
                .from('attendance_logs')
                .select(`
          id,
          email,
          login_time,
          logout_time,
          employees ( full_name )
        `)
                .gte('login_time', startOfDay(new Date(startDate)).toISOString())
                .lte('login_time', endOfDay(new Date(endDate)).toISOString())
                .order('login_time', { ascending: false });

            if (selectedEmployeeEmail !== 'all') {
                query = query.eq('email', selectedEmployeeEmail);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            if (data) {
                // Transform data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const records: AttendanceRecord[] = data.map((log: any) => ({
                    id: log.id,
                    name: log.employees?.full_name || log.email,
                    email: log.email,
                    loginTime: new Date(log.login_time),
                    logoutTime: log.logout_time ? new Date(log.logout_time) : null
                }));

                // Generate alerts to find status
                // We generate alerts for ALL records in the batch to determine their status
                // Note: generateAttendanceAlerts might return multiple alerts per record.
                const allAlerts = generateAttendanceAlerts(records);

                // Map alerts back to records
                const expandedRecords: ExpandedAttendanceRecord[] = records.map(record => {
                    const recordAlerts = allAlerts
                        .filter(a => a.attendanceId === record.id)
                        .map(a => a.type);

                    let duration = 0;
                    if (record.logoutTime) {
                        duration = (record.logoutTime.getTime() - record.loginTime.getTime()) / (1000 * 60 * 60);
                    }

                    return {
                        ...record,
                        alerts: recordAlerts,
                        duration
                    };
                });

                // Filter by status if needed
                let filtered = expandedRecords;
                if (selectedStatus !== 'ALL') {
                    filtered = expandedRecords.filter(r => r.alerts.includes(selectedStatus));
                }

                setLogs(filtered);
            }
        } catch (err: unknown) {
            console.error('Error fetching audit logs:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedEmployeeEmail, selectedStatus]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header & Filters */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2 items-center w-full">
                        {/* Date Range */}
                        <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded border border-gray-200">
                            <span className="text-xs text-gray-500 pl-2">Range:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block rounded border-none bg-transparent py-1 text-xs focus:ring-0 text-gray-900"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="block rounded border-none bg-transparent py-1 text-xs focus:ring-0 text-gray-900"
                            />
                        </div>

                        {/* Employee Filter */}
                        <select
                            value={selectedEmployeeEmail}
                            onChange={(e) => setSelectedEmployeeEmail(e.target.value)}
                            className="block w-40 rounded border-gray-300 py-1.5 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="all">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.email}>{emp.name}</option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as AlertType | 'ALL')}
                            className="block w-32 rounded border-gray-300 py-1.5 text-xs focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="LATE_ARRIVAL">Late Arrival</option>
                            <option value="EARLY_DEPARTURE">Early Departure</option>
                            <option value="UNDERTIME">Undertime</option>
                        </select>

                        <button
                            onClick={fetchLogs}
                            className="ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-medium"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hrs</th>
                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading data...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-red-500 text-sm">{error}</td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No records found.</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                        {formatDate(log.loginTime)}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="text-xs font-medium text-gray-900">{log.name}</div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                        {formatTime(log.loginTime)}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                        {log.logoutTime ? formatTime(log.logoutTime) : '-'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                                        {log.duration > 0 ? `${log.duration.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {log.alerts.length === 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                                                    OK
                                                </span>
                                            ) : (
                                                log.alerts.map(alert => (
                                                    <span
                                                        key={alert}
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${alert === 'LATE_ARRIVAL' ? 'bg-yellow-50 text-yellow-700' :
                                                            alert === 'EARLY_DEPARTURE' ? 'bg-orange-50 text-orange-700' :
                                                                alert === 'UNDERTIME' ? 'bg-red-50 text-red-700' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}
                                                    >
                                                        {alert === 'LATE_ARRIVAL' ? 'Late' :
                                                            alert === 'EARLY_DEPARTURE' ? 'Early Leave' :
                                                                alert === 'UNDERTIME' ? 'Undertime' : alert}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
