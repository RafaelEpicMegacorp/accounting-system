import dayjs from 'dayjs';
import { OrderFrequency } from '@prisma/client';

/**
 * Date calculation utilities for recurring billing
 */

export interface InvoiceSchedule {
  date: Date;
  description: string;
}

/**
 * Calculate the next invoice date based on current date and frequency
 */
export const calculateNextInvoiceDate = (
  startDate: Date,
  frequency: OrderFrequency,
  customDays?: number
): Date => {
  const start = dayjs(startDate);
  
  switch (frequency) {
    case 'WEEKLY':
      return start.add(7, 'day').toDate();
    
    case 'BIWEEKLY':
      return start.add(14, 'day').toDate();
    
    case 'MONTHLY':
      return start.add(1, 'month').toDate();
    
    case 'QUARTERLY':
      return start.add(3, 'month').toDate();
    
    case 'ANNUALLY':
      return start.add(1, 'year').toDate();
    
    case 'CUSTOM':
      if (!customDays || customDays < 1 || customDays > 365) {
        throw new Error('Custom frequency requires valid customDays (1-365)');
      }
      return start.add(customDays, 'day').toDate();
    
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
};

/**
 * Calculate the next invoice date from the last invoice date
 */
export const calculateNextInvoiceDateFromLast = (
  lastInvoiceDate: Date,
  frequency: OrderFrequency,
  customDays?: number
): Date => {
  return calculateNextInvoiceDate(lastInvoiceDate, frequency, customDays);
};

/**
 * Generate a schedule of upcoming invoice dates
 */
export const generateInvoiceSchedule = (
  startDate: Date,
  frequency: OrderFrequency,
  count: number = 5,
  customDays?: number
): InvoiceSchedule[] => {
  const schedule: InvoiceSchedule[] = [];
  let currentDate = dayjs(startDate);
  
  for (let i = 0; i < count; i++) {
    schedule.push({
      date: currentDate.toDate(),
      description: formatInvoiceDescription(currentDate.toDate(), frequency, i === 0)
    });
    
    // Calculate next date
    const nextDate = calculateNextInvoiceDate(currentDate.toDate(), frequency, customDays);
    currentDate = dayjs(nextDate);
  }
  
  return schedule;
};

/**
 * Format a human-readable description for an invoice date
 */
const formatInvoiceDescription = (date: Date, frequency: OrderFrequency, isFirst: boolean): string => {
  const dateStr = dayjs(date).format('MMM DD, YYYY');
  
  if (isFirst) {
    return `First invoice: ${dateStr}`;
  }
  
  const frequencyMap = {
    WEEKLY: 'weekly',
    BIWEEKLY: 'bi-weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    ANNUALLY: 'annual',
    CUSTOM: 'custom'
  };
  
  return `${frequencyMap[frequency]} invoice: ${dateStr}`;
};

/**
 * Handle edge cases for date calculations
 */
export const handleDateEdgeCases = (
  date: Date,
  frequency: OrderFrequency
): Date => {
  const dayJsDate = dayjs(date);
  
  // Handle end-of-month scenarios for monthly/quarterly/annual frequencies
  if (frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'ANNUALLY') {
    const originalDay = dayJsDate.date();
    const daysInTargetMonth = dayJsDate.daysInMonth();
    
    // If original date was end-of-month, keep it end-of-month
    if (originalDay >= daysInTargetMonth) {
      return dayJsDate.endOf('month').toDate();
    }
  }
  
  // Handle weekend scenarios - move to next business day
  const dayOfWeek = dayJsDate.day();
  if (dayOfWeek === 0) { // Sunday
    return dayJsDate.add(1, 'day').toDate();
  } else if (dayOfWeek === 6) { // Saturday
    return dayJsDate.add(2, 'day').toDate();
  }
  
  return date;
};

/**
 * Validate if a frequency and custom days combination is valid
 */
export const validateFrequencyAndCustomDays = (
  frequency: OrderFrequency,
  customDays?: number
): { isValid: boolean; error?: string } => {
  if (frequency === 'CUSTOM') {
    if (!customDays) {
      return { isValid: false, error: 'Custom frequency requires customDays' };
    }
    if (customDays < 1 || customDays > 365) {
      return { isValid: false, error: 'customDays must be between 1 and 365' };
    }
  } else {
    if (customDays !== undefined && customDays !== null) {
      return { isValid: false, error: 'customDays should only be provided for CUSTOM frequency' };
    }
  }
  
  return { isValid: true };
};

/**
 * Calculate days until next invoice
 */
export const getDaysUntilNextInvoice = (nextInvoiceDate: Date): number => {
  const now = dayjs();
  const next = dayjs(nextInvoiceDate);
  return next.diff(now, 'day');
};

/**
 * Check if an invoice is overdue
 */
export const isInvoiceOverdue = (dueDate: Date): boolean => {
  return dayjs().isAfter(dayjs(dueDate));
};

/**
 * Get frequency display text
 */
export const getFrequencyDisplayText = (
  frequency: OrderFrequency,
  customDays?: number
): string => {
  switch (frequency) {
    case 'WEEKLY':
      return 'Weekly';
    case 'BIWEEKLY':
      return 'Bi-weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'ANNUALLY':
      return 'Annually';
    case 'CUSTOM':
      return `Every ${customDays} day${customDays !== 1 ? 's' : ''}`;
    default:
      return 'Unknown';
  }
};

/**
 * Calculate estimated annual revenue for an order
 */
export const calculateEstimatedAnnualRevenue = (
  amount: number,
  frequency: OrderFrequency,
  customDays?: number
): number => {
  switch (frequency) {
    case 'WEEKLY':
      return amount * 52;
    case 'BIWEEKLY':
      return amount * 26;
    case 'MONTHLY':
      return amount * 12;
    case 'QUARTERLY':
      return amount * 4;
    case 'ANNUALLY':
      return amount;
    case 'CUSTOM':
      if (!customDays) return 0;
      return amount * Math.floor(365 / customDays);
    default:
      return 0;
  }
};