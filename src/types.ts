export interface AttendanceRecord {
    id: string;
    name: string;
    loginTime: Date;
    logoutTime: Date | null;
}

export interface AttendanceState {
    records: AttendanceRecord[];
    currentUser: string;
    isClockedIn: boolean;
    currentSessionId: string | null;
}

export type AttendanceAction =
    | { type: 'CLOCK_IN'; payload: { name: string } }
    | { type: 'CLOCK_OUT'; payload: { name: string } }
    | { type: 'LOAD_RECORDS'; payload: { records: AttendanceRecord[] } };

export const STORAGE_KEY = 'attendanceRecords';
