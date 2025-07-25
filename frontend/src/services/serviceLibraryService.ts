import axios from 'axios';

// Types
export type ServiceCategory = 
  | 'CONTENT_MARKETING'
  | 'PODCAST_SPONSORSHIP'
  | 'SOCIAL_MEDIA'
  | 'ADVERTISING'
  | 'CREATIVE_SERVICES'
  | 'PLATFORM_MANAGEMENT'
  | 'OTHER';

export interface ServiceLibrary {
  id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  defaultPrice?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFormData {
  name: string;
  description?: string;
  category: ServiceCategory;
  defaultPrice?: number;
  isActive?: boolean;
}

export interface ServiceSearchParams {
  search?: string;
  category?: ServiceCategory;
  isActive?: boolean;
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

// Service Library service
export const serviceLibraryService = {
  /**
   * Get all services with optional filtering
   */
  async getServices(params: ServiceSearchParams = {}): Promise<ServiceLibrary[]> {
    const response = await api.get('/api/services', { params });
    return response.data.data.services;
  },

  /**
   * Get single service by ID
   */
  async getService(id: string): Promise<ServiceLibrary> {
    const response = await api.get(`/api/services/${id}`);
    return response.data.data.service;
  },

  /**
   * Create new service
   */
  async createService(serviceData: ServiceFormData): Promise<ServiceLibrary> {
    const response = await api.post('/api/services', serviceData);
    return response.data.data.service;
  },

  /**
   * Update service
   */
  async updateService(id: string, serviceData: Partial<ServiceFormData>): Promise<ServiceLibrary> {
    const response = await api.patch(`/api/services/${id}`, serviceData);
    return response.data.data.service;
  },

  /**
   * Delete service
   */
  async deleteService(id: string): Promise<void> {
    await api.delete(`/api/services/${id}`);
  },
};

// Utility functions
export const getServiceCategoryOptions = (): Array<{ value: ServiceCategory; label: string }> => [
  { value: 'CONTENT_MARKETING', label: 'Content Marketing' },
  { value: 'PODCAST_SPONSORSHIP', label: 'Podcast Sponsorship' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'CREATIVE_SERVICES', label: 'Creative Services' },
  { value: 'PLATFORM_MANAGEMENT', label: 'Platform Management' },
  { value: 'OTHER', label: 'Other' },
];

export const getCategoryDisplayText = (category: ServiceCategory): string => {
  const categoryOption = getServiceCategoryOptions().find(option => option.value === category);
  return categoryOption?.label || category;
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export default serviceLibraryService;