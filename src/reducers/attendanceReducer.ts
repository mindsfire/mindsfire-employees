import { v4 as uuidv4 } from 'uuid';
import { AttendanceRecord, AttendanceState, AttendanceAction } from '@/types';

export const initialState: AttendanceState = {
  records: [],
  currentUser: '',
  isClockedIn: false,
  currentSessionId: null,
};

export function attendanceReducer(
  state: AttendanceState,
  action: AttendanceAction
): AttendanceState {
  switch (action.type) {
    case 'CLOCK_IN': {
      const newRecord: AttendanceRecord = {
        id: uuidv4(),
        name: action.payload.name,
        loginTime: new Date(),
        logoutTime: null,
      };
      return {
        ...state,
        records: [...state.records, newRecord],
        currentUser: action.payload.name,
        isClockedIn: true,
        currentSessionId: newRecord.id,
      };
    }
    case 'CLOCK_OUT': {
      if (!state.currentSessionId) return state;
      
      const updatedRecords = state.records.map(record => 
        record.id === state.currentSessionId
          ? { ...record, logoutTime: new Date() }
          : record
      );
      
      return {
        ...state,
        records: updatedRecords,
        isClockedIn: false,
        currentSessionId: null,
      };
    }
    case 'LOAD_RECORDS':
      return {
        ...state,
        records: action.payload.records,
      };
    default:
      return state;
  }
}

export const loadRecordsFromStorage = (): AttendanceRecord[] => {
  if (typeof window === 'undefined') return [];
  
  const savedRecords = localStorage.getItem('attendanceRecords');
  if (!savedRecords) return [];
  
  try {
    const parsedRecords = JSON.parse(savedRecords);
    return parsedRecords.map((record: AttendanceRecord) => ({
      ...record,
      loginTime: new Date(record.loginTime),
      logoutTime: record.logoutTime ? new Date(record.logoutTime) : null,
    }));
  } catch (error) {
    console.error('Error loading records from storage:', error);
    return [];
  }
};
