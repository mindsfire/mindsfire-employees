
export interface AttendanceRecord {
  id: string;
  name: string;
  email: string;
  loginTime: Date;
  logoutTime: Date | null;
}

export type AlertType = 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'UNDERTIME' | 'ABSENT';

export interface AttendanceAlert {
  id: string; // Unique ID for the alert (could be recordId + type)
  attendanceId: string;
  employeeName: string;
  email: string; // valid email
  type: AlertType;
  message: string;
  date: string; // ISO date string YYYY-MM-DD
  severity: 'low' | 'medium' | 'high';
}

const DEFAULT_START_HOUR = 10; // 10:00 AM
const DEFAULT_END_HOUR = 19;   // 07:00 PM
const MIN_WORK_HOURS = 9;

export const generateAttendanceAlerts = (
  records: AttendanceRecord[], 
  startHour: number = DEFAULT_START_HOUR,
  endHour: number = DEFAULT_END_HOUR
): AttendanceAlert[] => {
  const alerts: AttendanceAlert[] = [];

  records.forEach((record) => {
    const loginTime = new Date(record.loginTime);
    const logoutTime = record.logoutTime ? new Date(record.logoutTime) : null;
    const dateStr = loginTime.toISOString().split('T')[0];

    // Check for Late Arrival
    if (loginTime.getHours() > startHour || (loginTime.getHours() === startHour && loginTime.getMinutes() > 0)) {
       alerts.push({
         id: `${record.id}-late`,
         attendanceId: record.id,
         employeeName: record.name,
         email: record.email,
         type: 'LATE_ARRIVAL',
         message: `${record.name} clocked in late at ${loginTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
         date: dateStr,
         severity: 'medium'
       });
    }

    // Check for End of Day conditions (Early Departure & Undertime)
    // Only check if logout exist
    if (logoutTime) {
      // Early Departure
      if (logoutTime.getHours() < endHour) {
        alerts.push({
          id: `${record.id}-early`,
          attendanceId: record.id,
          employeeName: record.name,
          email: record.email,
          type: 'EARLY_DEPARTURE',
          message: `${record.name} left early at ${logoutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          date: dateStr,
          severity: 'medium'
        });
      }

      // Undertime Calculation
      const durationMs = logoutTime.getTime() - loginTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      if (durationHours < MIN_WORK_HOURS) {
         alerts.push({
           id: `${record.id}-undertime`,
           attendanceId: record.id,
           employeeName: record.name,
           email: record.email,
           type: 'UNDERTIME',
           message: `${record.name} worked only ${durationHours.toFixed(1)} hours (less than ${MIN_WORK_HOURS}h)`,
           date: dateStr,
           severity: 'high'
         });
      }
    }
  });

  return alerts;
};
