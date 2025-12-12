'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AttendanceState, AttendanceAction, STORAGE_KEY } from '@/types';
import { attendanceReducer, initialState } from '@/reducers/attendanceReducer';
import { loadRecordsFromStorage } from '@/reducers/attendanceReducer';

type AttendanceContextType = {
  state: AttendanceState;
  dispatch: React.Dispatch<AttendanceAction>;
  handleClockIn: (name: string) => void;
  handleClockOut: (name: string) => void;
  formatTime: (date: Date | null) => string;
  calculateDuration: (loginTime: Date, logoutTime: Date | null) => string;
};

const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined
);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(attendanceReducer, initialState);

  // Load records from localStorage on initial render
  useEffect(() => {
    const savedRecords = localStorage.getItem(STORAGE_KEY);
    if (savedRecords) {
      try {
        const parsedRecords = JSON.parse(savedRecords);
        // Convert string dates back to Date objects
        interface RawAttendanceRecord {
  id: string;
  name: string;
  loginTime: string;
  logoutTime: string | null;
}

        const recordsWithDates = parsedRecords.map((record: RawAttendanceRecord) => ({
          ...record,
          loginTime: new Date(record.loginTime),
          logoutTime: record.logoutTime ? new Date(record.logoutTime) : null,
        }));
        dispatch({
          type: 'LOAD_RECORDS',
          payload: { records: recordsWithDates }
        });
      } catch (error) {
        console.error('Failed to parse saved records:', error);
      }
    }
  }, []);

  // Save records to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  }, [state.records]);

  const handleClockIn = (name: string) => {
    if (!name.trim()) {
      alert('Please enter your name before clocking in');
      return;
    }
    
    if (state.isClockedIn) {
      alert('You are already clocked in!');
      return;
    }
    
    dispatch({ type: 'CLOCK_IN', payload: { name } });
  };

  const handleClockOut = (name: string) => {
    if (!name.trim()) {
      alert('Please enter your name before clocking out');
      return;
    }
    
    if (!state.isClockedIn) {
      alert('You are not currently clocked in!');
      return;
    }
    
    dispatch({ type: 'CLOCK_OUT', payload: { name } });
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(date));
  };

  const calculateDuration = (loginTime: Date, logoutTime: Date | null): string => {
    if (!logoutTime) return 'In Progress...';
    
    const diffInMs = new Date(logoutTime).getTime() - new Date(loginTime).getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    
    const hours = Math.floor(diffInSecs / 3600);
    const minutes = Math.floor((diffInSecs % 3600) / 60);
    const seconds = diffInSecs % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AttendanceContext.Provider
      value={{
        state,
        dispatch,
        handleClockIn,
        handleClockOut,
        formatTime,
        calculateDuration,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = (): AttendanceContextType => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
