import axios from 'axios';

// Types
export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHECK' | 'CASH' | 'OTHER';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paidDate: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentWithInvoice extends Payment {
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    client: {
      id: string;
      name: string;
      company?: string;
    };
  };
}

export interface PaymentFormData {
  amount: number;
  method: PaymentMethod;
  paidDate?: string;
  notes?: string;
}

export interface PaymentSummary {
  totalPaid: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  paymentCount: number;
}

export interface PaymentHistory {
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    client: {
      id: string;
      name: string;
      company?: string;
    };
    order: {
      id: string;
      description: string;
    };
  };
  payments: Payment[];
  summary: PaymentSummary;
}

export interface PaymentListResponse {
  payments: PaymentWithInvoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaymentSearchParams {
  page?: number;
  limit?: number;
  clientId?: string;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string;
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

// Payment service
export const paymentService = {
  /**
   * Record a payment for an invoice
   */
  async recordPayment(invoiceId: string, paymentData: PaymentFormData): Promise<{
    payment: Payment;
    invoice: any;
    paymentSummary: {
      totalPaid: number;
      remainingAmount: number;
      isFullyPaid: boolean;
    };
  }> {
    const response = await api.post(`/api/payments/invoice/${invoiceId}`, paymentData);
    return response.data.data;
  },

  /**
   * Get payment history for an invoice
   */
  async getInvoicePaymentHistory(invoiceId: string): Promise<PaymentHistory> {
    const response = await api.get(`/api/payments/invoice/${invoiceId}`);
    return response.data.data;
  },

  /**
   * Update a payment record
   */
  async updatePayment(paymentId: string, paymentData: Partial<PaymentFormData>): Promise<Payment> {
    const response = await api.put(`/api/payments/${paymentId}`, paymentData);
    return response.data.data.payment;
  },

  /**
   * Delete a payment record
   */
  async deletePayment(paymentId: string): Promise<{
    deletedPaymentId: string;
    invoiceId: string;
    remainingPaidAmount: number;
    invoiceAmount: number;
  }> {
    const response = await api.delete(`/api/payments/${paymentId}`);
    return response.data.data;
  },

  /**
   * Get all payments with filtering and pagination
   */
  async getPayments(params: PaymentSearchParams = {}): Promise<PaymentListResponse> {
    const response = await api.get('/api/payments', { params });
    return response.data.data;
  },
};

// Utility functions
export const getPaymentMethodOptions = (): Array<{ value: PaymentMethod; label: string }> => [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CASH', label: 'Cash' },
  { value: 'OTHER', label: 'Other' },
];

export const getPaymentMethodLabel = (method: PaymentMethod): string => {
  const methodOption = getPaymentMethodOptions().find(option => option.value === method);
  return methodOption?.label || method;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

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

export const calculatePaymentSummary = (payments: Payment[], invoiceAmount: number): PaymentSummary => {
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    totalPaid,
    remainingAmount: invoiceAmount - totalPaid,
    isFullyPaid: totalPaid >= invoiceAmount,
    paymentCount: payments.length,
  };
};

export const validatePaymentAmount = (amount: number, remainingAmount: number): string | null => {
  if (amount <= 0) {
    return 'Payment amount must be greater than zero';
  }
  if (amount > remainingAmount) {
    return `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`;
  }
  return null;
};

export default paymentService;