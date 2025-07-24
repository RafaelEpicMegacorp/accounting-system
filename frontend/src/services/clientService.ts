import axios from 'axios';

// Types
export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWithCounts extends Client {
  _count: {
    orders: number;
    invoices: number;
  };
}

export interface ClientDetail extends Client {
  orders: Array<{
    id: string;
    description: string;
    amount: number;
    frequency: string;
    status: string;
    startDate: string;
    nextInvoiceDate: string;
    createdAt: string;
  }>;
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
    orders: number;
    invoices: number;
  };
}

export interface ClientFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
}

export interface ClientListResponse {
  clients: ClientWithCounts[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ClientSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

// Client service
export const clientService = {
  /**
   * Get clients with pagination and search
   */
  async getClients(params: ClientSearchParams = {}): Promise<ClientListResponse> {
    const response = await api.get('/api/clients', { params });
    return response.data.data;
  },

  /**
   * Get single client by ID
   */
  async getClient(id: string): Promise<ClientDetail> {
    const response = await api.get(`/api/clients/${id}`);
    return response.data.data.client;
  },

  /**
   * Create new client
   */
  async createClient(clientData: ClientFormData): Promise<Client> {
    const response = await api.post('/api/clients', clientData);
    return response.data.data.client;
  },

  /**
   * Update existing client
   */
  async updateClient(id: string, clientData: ClientFormData): Promise<Client> {
    const response = await api.put(`/api/clients/${id}`, clientData);
    return response.data.data.client;
  },

  /**
   * Delete client
   */
  async deleteClient(id: string): Promise<void> {
    await api.delete(`/api/clients/${id}`);
  },

  /**
   * Search clients
   */
  async searchClients(query: string, limit = 10): Promise<Client[]> {
    const response = await api.get('/api/clients/search', {
      params: { q: query, limit }
    });
    return response.data.data.clients;
  },
};

export default clientService;