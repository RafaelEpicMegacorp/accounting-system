import { useState, useCallback } from 'react';

export interface PanelConfig {
  id: string;
  title?: string;
  subtitle?: string;
  width?: number | string;
  position?: 'left' | 'right';
  allowFullscreen?: boolean;
  allowDrag?: boolean;
  showBackdrop?: boolean;
  persistent?: boolean;
  data?: any;
}

export interface PanelState extends PanelConfig {
  open: boolean;
}

export const useSlidingPanel = () => {
  const [panels, setPanels] = useState<PanelState[]>([]);

  const openPanel = useCallback((config: PanelConfig) => {
    setPanels(prev => {
      // Close any existing panel with the same ID
      const filtered = prev.filter(panel => panel.id !== config.id);
      
      return [
        ...filtered,
        {
          ...config,
          open: true,
        },
      ];
    });
  }, []);

  const closePanel = useCallback((id: string) => {
    setPanels(prev => 
      prev.map(panel => 
        panel.id === id 
          ? { ...panel, open: false }
          : panel
      )
    );

    // Remove panel after animation completes
    setTimeout(() => {
      setPanels(prev => prev.filter(panel => panel.id !== id));
    }, 300);
  }, []);

  const updatePanel = useCallback((id: string, updates: Partial<PanelConfig>) => {
    setPanels(prev =>
      prev.map(panel =>
        panel.id === id
          ? { ...panel, ...updates }
          : panel
      )
    );
  }, []);

  const closeAllPanels = useCallback(() => {
    setPanels(prev => 
      prev.map(panel => ({ ...panel, open: false }))
    );

    setTimeout(() => {
      setPanels([]);
    }, 300);
  }, []);

  const getPanel = useCallback((id: string) => {
    return panels.find(panel => panel.id === id);
  }, [panels]);

  const isPanelOpen = useCallback((id: string) => {
    return panels.some(panel => panel.id === id && panel.open);
  }, [panels]);

  return {
    panels,
    openPanel,
    closePanel,
    updatePanel,
    closeAllPanels,
    getPanel,
    isPanelOpen,
  };
};

// Predefined panel configurations for common use cases
export const panelConfigs = {
  // Invoice detail panel
  invoiceDetail: (invoiceId: string): PanelConfig => ({
    id: `invoice-detail-${invoiceId}`,
    title: 'Invoice Details',
    subtitle: `Invoice #${invoiceId}`,
    width: '60%',
    position: 'right',
    allowFullscreen: true,
    data: { invoiceId },
  }),

  // Client detail panel
  clientDetail: (clientId: string): PanelConfig => ({
    id: `client-detail-${clientId}`,
    title: 'Client Details',
    width: '50%',
    position: 'right',
    allowFullscreen: true,
    data: { clientId },
  }),

  // Create/Edit forms
  createInvoice: (): PanelConfig => ({
    id: 'create-invoice',
    title: 'Create Invoice',
    width: '70%',
    position: 'right',
    allowFullscreen: true,
    persistent: true, // Don't close on backdrop click
  }),

  editInvoice: (invoiceId: string): PanelConfig => ({
    id: `edit-invoice-${invoiceId}`,
    title: 'Edit Invoice',
    subtitle: `Invoice #${invoiceId}`,
    width: '70%',
    position: 'right',
    allowFullscreen: true,
    persistent: true,
    data: { invoiceId },
  }),

  // Quick preview panels
  quickPreview: (title: string, data?: any): PanelConfig => ({
    id: `quick-preview-${Date.now()}`,
    title,
    width: '40%',
    position: 'right',
    allowFullscreen: false,
    allowDrag: true,
    data,
  }),

  // Settings panel
  settings: (): PanelConfig => ({
    id: 'settings',
    title: 'Settings',
    width: '50%',
    position: 'right',
    allowFullscreen: true,
  }),

  // Analytics panel
  analytics: (): PanelConfig => ({
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Detailed insights and reports',
    width: '80%',
    position: 'right',
    allowFullscreen: true,
  }),
};