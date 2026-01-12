import { AttendanceRecord } from '../pages/index';
import { startOfDay, daysAgo, startOfMonth } from '../utils/dateUtils';

interface StatsCardsProps {
  records: AttendanceRecord[];
  currentSessionId: string | null;
  userName: string;
}

export default function StatsCards({ records, currentSessionId, userName }: StatsCardsProps) {
  // Calculate stats
  const userRecords = records.filter(record => record.name === userName);

  // Today's stats
  const today = startOfDay();
  // todayRecords filtered but not currently used in summary

  // This week stats (last 7 days)
  const weekAgo = daysAgo(7);
  const weekRecords = userRecords.filter(record => record.loginTime >= weekAgo);

  // This month stats
  const thisMonth = startOfMonth();
  const monthRecords = userRecords.filter(record => record.loginTime >= thisMonth);

  // Calculate total hours
  const calculateTotalHours = (records: AttendanceRecord[]) => {
    return records.reduce((total, record) => {
      if (record.logoutTime) {
        const diff = record.logoutTime.getTime() - record.loginTime.getTime();
        return total + diff;
      }
      return total;
    }, 0);
  };

  // Calculate average hours
  const calculateAverageHours = (records: AttendanceRecord[]) => {
    const completedRecords = records.filter(r => r.logoutTime);
    if (completedRecords.length === 0) return 0;
    const totalMs = calculateTotalHours(completedRecords);
    return totalMs / completedRecords.length;
  };

  // Format hours
  const formatHours = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Count late arrivals
  const countLateArrivals = (records: AttendanceRecord[]) => {
    return records.filter(record => {
      const hour = record.loginTime.getHours();
      return hour > 10; // After 10 AM is late
    }).length;
  };

  // Current session duration
  const currentSessionDuration = currentSessionId ? (() => {
    const session = userRecords.find(r => r.id === currentSessionId);
    if (session) {
      const now = new Date();
      const diff = now.getTime() - session.loginTime.getTime();
      return formatHours(diff);
    }
    return '0h 0m';
  })() : '0h 0m';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Today's Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Today&apos;s Status</h3>
          <div className={`w-3 h-3 rounded-full ${currentSessionId ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {currentSessionId ? 'Clocked In' : 'Not Clocked In'}
        </div>
        {currentSessionId && (
          <div className="text-sm text-gray-600 mt-1">
            Duration: {currentSessionDuration}
          </div>
        )}
      </div>

      {/* Weekly Hours Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">This Week</h3>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {formatHours(calculateTotalHours(weekRecords))}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {weekRecords.filter(r => r.logoutTime).length} days completed
        </div>
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">This Month</h3>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {monthRecords.filter(r => r.logoutTime).length} days
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Avg: {formatHours(calculateAverageHours(monthRecords))}
        </div>
      </div>

      {/* Punctuality Score Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">Punctuality</h3>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {monthRecords.length > 0
            ? Math.round(((monthRecords.length - countLateArrivals(monthRecords)) / monthRecords.length) * 100)
            : 0}%
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {countLateArrivals(monthRecords)} late this month
        </div>
      </div>
    </div>
  );
}
