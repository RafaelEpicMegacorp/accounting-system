import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { navigationItems } from './navigationConfig';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ElementType;
  disabled?: boolean;
}

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (breadcrumb: BreadcrumbItem) => void;
  updateBreadcrumb: (index: number, breadcrumb: Partial<BreadcrumbItem>) => void;
  resetBreadcrumbs: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
};

interface BreadcrumbProviderProps {
  children: React.ReactNode;
}

export const BreadcrumbProvider: React.FC<BreadcrumbProviderProps> = ({ children }) => {
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([]);

  // Auto-generate breadcrumbs based on current route
  useEffect(() => {
    const generateBreadcrumbs = () => {
      const pathSegments = location.pathname.split('/').filter(Boolean);
      const newBreadcrumbs: BreadcrumbItem[] = [];

      // Always add home if we're not on the root path
      if (location.pathname !== '/') {
        newBreadcrumbs.push({
          label: 'Dashboard',
          path: '/',
          icon: navigationItems.find(item => item.path === '/')?.icon,
        });
      }

      // Build breadcrumbs from path segments
      let currentPath = '';
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        
        // Find matching navigation item
        const navItem = navigationItems.find(item => 
          matchPath({ path: item.path, exact: false }, currentPath)
        );

        if (navItem) {
          newBreadcrumbs.push({
            label: navItem.label,
            path: navItem.path,
            icon: navItem.icon,
            disabled: index === pathSegments.length - 1, // Disable current page
          });
        } else {
          // Fallback for dynamic routes
          newBreadcrumbs.push({
            label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
            path: currentPath,
            disabled: index === pathSegments.length - 1,
          });
        }
      });

      return newBreadcrumbs;
    };

    setBreadcrumbsState(generateBreadcrumbs());
  }, [location.pathname]);

  const setBreadcrumbs = (newBreadcrumbs: BreadcrumbItem[]) => {
    setBreadcrumbsState(newBreadcrumbs);
  };

  const addBreadcrumb = (breadcrumb: BreadcrumbItem) => {
    setBreadcrumbsState(prev => [...prev, breadcrumb]);
  };

  const updateBreadcrumb = (index: number, breadcrumb: Partial<BreadcrumbItem>) => {
    setBreadcrumbsState(prev => 
      prev.map((item, i) => i === index ? { ...item, ...breadcrumb } : item)
    );
  };

  const resetBreadcrumbs = () => {
    setBreadcrumbsState([]);
  };

  return (
    <BreadcrumbContext.Provider
      value={{
        breadcrumbs,
        setBreadcrumbs,
        addBreadcrumb,
        updateBreadcrumb,
        resetBreadcrumbs,
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
};