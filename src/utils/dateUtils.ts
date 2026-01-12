/**
 * Date utility functions to handle Date objects immutably.
 * Always returns a new Date instance.
 */

export const startOfDay = (date: Date = new Date()): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const endOfDay = (date: Date = new Date()): Date => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

export const daysAgo = (days: number, fromDate: Date = new Date()): Date => {
    const d = new Date(fromDate);
    d.setDate(d.getDate() - days);
    return d;
};

export const startOfMonth = (date: Date = new Date()): Date => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const cloneDate = (date: Date): Date => {
    return new Date(date);
};
