import {
  Dashboard,
  People,
  ShoppingCart,
  Receipt,
  BusinessCenter,
  Settings,
  Analytics,
  AccountBalance,
} from '@mui/icons-material';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavigationItem[];
  keywords?: string[]; // For command palette search
  shortcut?: string; // Keyboard shortcut
  requiresAuth?: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: Dashboard,
    keywords: ['home', 'overview', 'summary'],
    shortcut: 'G D',
    requiresAuth: true,
  },
  {
    id: 'clients',
    label: 'Clients',
    path: '/clients',
    icon: People,
    keywords: ['customers', 'contacts', 'people'],
    shortcut: 'G C',
    requiresAuth: true,
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/orders',
    icon: ShoppingCart,
    keywords: ['recurring', 'subscriptions', 'orders'],
    shortcut: 'G O',
    requiresAuth: true,
  },
  {
    id: 'invoices',
    label: 'Invoices',
    path: '/invoices',
    icon: Receipt,
    keywords: ['bills', 'payments', 'invoices'],
    shortcut: 'G I',
    requiresAuth: true,
  },
  {
    id: 'services',
    label: 'Services',
    path: '/services',
    icon: BusinessCenter,
    keywords: ['products', 'services', 'catalog'],
    shortcut: 'G S',
    requiresAuth: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: Analytics,
    keywords: ['reports', 'insights', 'analytics', 'metrics'],
    shortcut: 'G A',
    requiresAuth: true,
  },
  {
    id: 'banking',
    label: 'Banking',
    path: '/banking',
    icon: AccountBalance,
    keywords: ['transactions', 'bank', 'payments'],
    shortcut: 'G B',
    requiresAuth: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    keywords: ['preferences', 'configuration', 'settings'],
    shortcut: 'G T',
    requiresAuth: true,
  },
];

// Quick actions for command palette
export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  icon?: React.ElementType;
  keywords?: string[];
  shortcut?: string;
  category: 'navigation' | 'action' | 'search' | 'settings';
}

export const getQuickActions = (): QuickAction[] => [
  // Navigation actions
  ...navigationItems.map(item => ({
    id: `nav-${item.id}`,
    label: `Go to ${item.label}`,
    description: `Navigate to ${item.label} page`,
    action: () => window.location.href = item.path,
    icon: item.icon,
    keywords: ['go', 'navigate', ...(item.keywords || [])],
    shortcut: item.shortcut,
    category: 'navigation' as const,
  })),
  
  // Quick actions
  {
    id: 'create-invoice',
    label: 'Create Invoice',
    description: 'Create a new invoice',
    action: () => {}, // TODO: Implement navigation to invoice creation
    icon: Receipt,
    keywords: ['new', 'create', 'invoice', 'bill'],
    shortcut: 'C I',
    category: 'action',
  },
  {
    id: 'add-client',
    label: 'Add Client',
    description: 'Add a new client',
    action: () => {}, // TODO: Implement navigation to client creation
    icon: People,
    keywords: ['new', 'add', 'client', 'customer'],
    shortcut: 'C C',
    category: 'action',
  },
  {
    id: 'create-order',
    label: 'Create Order',
    description: 'Create a new recurring order',
    action: () => {}, // TODO: Implement navigation to order creation
    icon: ShoppingCart,
    keywords: ['new', 'create', 'order', 'recurring'],
    shortcut: 'C O',
    category: 'action',
  },
  
  // Settings actions
  {
    id: 'toggle-theme',
    label: 'Toggle Theme',
    description: 'Switch between light and dark mode',
    action: () => {}, // TODO: Implement theme toggle functionality
    keywords: ['theme', 'dark', 'light', 'mode'],
    shortcut: 'T T',
    category: 'settings',
  },
];

// Filter navigation items based on authentication
export const getFilteredNavigation = (isAuthenticated: boolean): NavigationItem[] => {
  return navigationItems.filter(item => 
    !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );
};