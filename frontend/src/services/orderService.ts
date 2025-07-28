import axios from 'axios';
import { Client } from './clientService';

// Types
export type OrderFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'CUSTOM';
export type OrderStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface Order {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  frequency: OrderFrequency;
  status: OrderStatus;
  startDate: string;
  nextInvoiceDate: string;
  customDays?: number;
  leadTimeDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithClient extends Order {
  client: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  _count: {
    invoices: number;
  };
}

export interface OrderDetail extends Order {
  client: {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    issueDate: string;
    dueDate: string;
    paidDate?: string;
  }>;
  _count: {
    invoices: number;
  };
  frequencyDisplay: string;
  estimatedAnnualRevenue: number;
  upcomingSchedule: Array<{
    date: string;
    description: string;
  }>;
}

export interface OrderFormData {
  clientId: string;
  description: string;
  amount: number;
  frequency: OrderFrequency;
  startDate: string;
  customDays?: number;
  leadTimeDays?: number;
}

export interface OrderListResponse {
  orders: OrderWithClient[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface OrderSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  clientId?: string;
  status?: OrderStatus;
  frequency?: OrderFrequency;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceSchedule {
  date: string;
  description: string;
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

// Order service
export const orderService = {
  /**
   * Get orders with pagination and search
   */
  async getOrders(params: OrderSearchParams = {}): Promise<OrderListResponse> {
    const response = await api.get('/api/orders', { params });
    return response.data.data;
  },

  /**
   * Get single order by ID
   */
  async getOrder(id: string): Promise<OrderDetail> {
    const response = await api.get(`/api/orders/${id}`);
    return response.data.data.order;
  },

  /**
   * Create new order
   */
  async createOrder(orderData: OrderFormData): Promise<Order> {
    const response = await api.post('/api/orders', orderData);
    return response.data.data.order;
  },

  /**
   * Update existing order
   */
  async updateOrder(id: string, orderData: OrderFormData): Promise<Order> {
    const response = await api.put(`/api/orders/${id}`, orderData);
    return response.data.data.order;
  },

  /**
   * Update order status only
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const response = await api.patch(`/api/orders/${id}/status`, { status });
    return response.data.data.order;
  },

  /**
   * Delete/cancel order
   */
  async deleteOrder(id: string): Promise<void> {
    await api.delete(`/api/orders/${id}`);
  },

  /**
   * Get order invoice schedule
   */
  async getOrderSchedule(id: string, count = 5): Promise<{
    schedule: InvoiceSchedule[];
    orderStatus: OrderStatus;
    count: number;
  }> {
    const response = await api.get(`/api/orders/${id}/schedule`, {
      params: { count }
    });
    return response.data.data;
  },
};

// Utility functions
export const getFrequencyOptions = (): Array<{ value: OrderFrequency; label: string }> => [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
  { value: 'CUSTOM', label: 'Custom' },
];

export const getStatusOptions = (): Array<{ value: OrderStatus; label: string; color: string }> => [
  { value: 'ACTIVE', label: 'Active', color: 'success' },
  { value: 'PAUSED', label: 'Paused', color: 'warning' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
];

export const getFrequencyDisplayText = (frequency: OrderFrequency, customDays?: number): string => {
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

export default orderService;