import axios from 'axios';
import { Client } from './clientService';

// Types
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH';

export interface Invoice {
  id: string;
  orderId?: string;
  clientId: string;
  companyId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  sentDate?: string;
  paidDate?: string;
  status: InvoiceStatus;
  notes?: string;
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceWithRelations extends Invoice {
  client: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  order?: {
    id: string;
    description: string;
    frequency: string;
  };
  items?: InvoiceItem[];
}

export interface InvoiceDetail extends Invoice {
  client: {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
  };
  order?: {
    id: string;
    description: string;
    frequency: string;
    status: string;
  };
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  serviceId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  createdAt: string;
}

export interface InvoiceFormData {
  clientId: string;
  companyId: string;
  orderId?: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  items?: Array<{
    serviceId?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface InvoiceListResponse {
  invoices: InvoiceWithRelations[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface InvoiceSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  orderId?: string;
  status?: InvoiceStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceStatistics {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
}

// API base URL - should always come from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Invoice service
export const invoiceService = {
  /**
   * Get invoices with pagination and search
   */
  async getInvoices(params: InvoiceSearchParams = {}): Promise<InvoiceListResponse> {
    const response = await api.get('/api/invoices', { params });
    return response.data.data;
  },

  /**
   * Get single invoice by ID
   */
  async getInvoice(id: string): Promise<InvoiceDetail> {
    const response = await api.get(`/api/invoices/${id}`);
    return response.data.data.invoice;
  },

  /**
   * Create new manual invoice
   */
  async createInvoice(invoiceData: InvoiceFormData): Promise<Invoice> {
    const response = await api.post('/api/invoices', invoiceData);
    return response.data.data.invoice;
  },

  /**
   * Generate invoice from order
   */
  async generateInvoiceFromOrder(orderId: string): Promise<Invoice> {
    const response = await api.post(`/api/invoices/generate/${orderId}`);
    return response.data.data.invoice;
  },

  /**
   * Update invoice status only
   */
  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const response = await api.patch(`/api/invoices/${id}/status`, { status });
    return response.data.data.invoice;
  },

  /**
   * Delete draft invoice
   */
  async deleteInvoice(id: string): Promise<void> {
    await api.delete(`/api/invoices/${id}`);
  },

  /**
   * Download invoice as PDF
   */
  async downloadInvoicePdf(id: string): Promise<Blob> {
    const response = await api.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Send invoice via email
   */
  async sendInvoiceEmail(id: string): Promise<{ emailSent: boolean; sentTo: string; invoice: Invoice }> {
    const response = await api.post(`/api/invoices/${id}/send`);
    return response.data.data;
  },

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder(id: string, reminderType: 'before_due' | 'due_today' | 'overdue'): Promise<{ reminderSent: boolean; sentTo: string; reminderType: string }> {
    const response = await api.post(`/api/invoices/${id}/reminder`, { reminderType });
    return response.data.data;
  },

  /**
   * Get invoice statistics for dashboard
   */
  async getInvoiceStatistics(): Promise<InvoiceStatistics> {
    const response = await api.get('/api/invoices/statistics');
    return response.data.data;
  },
};

// Utility functions
export const getStatusOptions = (): Array<{ value: InvoiceStatus; label: string; color: string }> => [
  { value: 'DRAFT', label: 'Draft', color: 'default' },
  { value: 'SENT', label: 'Sent', color: 'info' },
  { value: 'PAID', label: 'Paid', color: 'success' },
  { value: 'OVERDUE', label: 'Overdue', color: 'error' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'warning' },
];

export const getStatusDisplayText = (status: InvoiceStatus): string => {
  const statusOption = getStatusOptions().find(option => option.value === status);
  return statusOption?.label || status;
};

export const getStatusColor = (status: InvoiceStatus): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const statusOption = getStatusOptions().find(option => option.value === status);
  return (statusOption?.color as 'default' | 'info' | 'success' | 'error' | 'warning') || 'default';
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const getCurrencyOptions = (): Array<{ value: Currency; label: string; symbol: string }> => [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'BTC', label: 'Bitcoin', symbol: '₿' },
  { value: 'ETH', label: 'Ethereum', symbol: 'Ξ' },
];

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isOverdue = (invoice: Invoice): boolean => {
  if (invoice.status !== 'SENT') return false;
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  return dueDate < now;
};

export const getDaysUntilDue = (invoice: Invoice): number => {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDueDateStatus = (invoice: Invoice): {
  text: string;
  color: 'success' | 'warning' | 'error' | 'info';
} => {
  if (invoice.status === 'PAID') {
    return { text: 'Paid', color: 'success' };
  }
  
  if (invoice.status === 'DRAFT') {
    return { text: 'Draft', color: 'info' };
  }
  
  if (invoice.status === 'CANCELLED') {
    return { text: 'Cancelled', color: 'warning' };
  }

  const daysUntilDue = getDaysUntilDue(invoice);
  
  if (daysUntilDue < 0) {
    return { text: `${Math.abs(daysUntilDue)} days overdue`, color: 'error' };
  } else if (daysUntilDue === 0) {
    return { text: 'Due today', color: 'warning' };
  } else if (daysUntilDue <= 3) {
    return { text: `Due in ${daysUntilDue} days`, color: 'warning' };
  } else {
    return { text: `Due in ${daysUntilDue} days`, color: 'info' };
  }
};

export const canDeleteInvoice = (invoice: Invoice): boolean => {
  return invoice.status === 'DRAFT';
};

export const canUpdateStatus = (invoice: Invoice, newStatus: InvoiceStatus): boolean => {
  const currentStatus = invoice.status;
  
  // Define allowed status transitions
  const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
    PAID: [], // Paid invoices cannot change status
    OVERDUE: ['PAID', 'CANCELLED'],
    CANCELLED: [], // Cancelled invoices cannot change status
  };
  
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

export const getNextAllowedStatuses = (invoice: Invoice): InvoiceStatus[] => {
  const currentStatus = invoice.status;
  
  const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
    PAID: [],
    OVERDUE: ['PAID', 'CANCELLED'],
    CANCELLED: [],
  };
  
  return allowedTransitions[currentStatus] || [];
};

export default invoiceService;