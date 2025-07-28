import axios from 'axios';

// Types
export interface Company {
  id: string;
  name: string;
  legalName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxCode?: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  signature?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  companyId: string;
  type: 'CRYPTO_WALLET' | 'BANK_ACCOUNT' | 'OTHER';
  name: string;
  details: any; // Flexible JSON storage
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyWithPaymentMethods extends Company {
  paymentMethods: PaymentMethod[];
}

export interface CompanyFormData {
  name: string;
  legalName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxCode?: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  signature?: string;
  isActive?: boolean;
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

// Company service
export const companyService = {
  /**
   * Get all companies
   */
  async getCompanies(): Promise<Company[]> {
    const response = await api.get('/api/companies');
    return response.data.data.companies;
  },

  /**
   * Get single company by ID with payment methods
   */
  async getCompany(id: string): Promise<CompanyWithPaymentMethods> {
    const response = await api.get(`/api/companies/${id}`);
    return response.data.data.company;
  },

  /**
   * Create new company
   */
  async createCompany(companyData: CompanyFormData): Promise<Company> {
    const response = await api.post('/api/companies', companyData);
    return response.data.data.company;
  },

  /**
   * Update company
   */
  async updateCompany(id: string, companyData: Partial<CompanyFormData>): Promise<Company> {
    const response = await api.patch(`/api/companies/${id}`, companyData);
    return response.data.data.company;
  },

  /**
   * Delete company (only if no invoices exist)
   */
  async deleteCompany(id: string): Promise<void> {
    await api.delete(`/api/companies/${id}`);
  },

  /**
   * Get payment methods for a company
   */
  async getPaymentMethods(companyId: string): Promise<PaymentMethod[]> {
    const response = await api.get(`/api/companies/${companyId}/payment-methods`);
    return response.data.data.paymentMethods;
  },

  /**
   * Add payment method to company
   */
  async addPaymentMethod(companyId: string, paymentMethodData: {
    type: 'CRYPTO_WALLET' | 'BANK_ACCOUNT' | 'OTHER';
    name: string;
    details: any;
  }): Promise<PaymentMethod> {
    const response = await api.post(`/api/companies/${companyId}/payment-methods`, paymentMethodData);
    return response.data.data.paymentMethod;
  },

  /**
   * Update payment method
   */
  async updatePaymentMethod(companyId: string, paymentMethodId: string, data: {
    name?: string;
    details?: any;
    isActive?: boolean;
  }): Promise<PaymentMethod> {
    const response = await api.patch(`/api/companies/${companyId}/payment-methods/${paymentMethodId}`, data);
    return response.data.data.paymentMethod;
  },

  /**
   * Delete payment method
   */
  async deletePaymentMethod(companyId: string, paymentMethodId: string): Promise<void> {
    await api.delete(`/api/companies/${companyId}/payment-methods/${paymentMethodId}`);
  },
};

export default companyService;