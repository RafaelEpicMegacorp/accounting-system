import React, { createContext, useContext } from 'react';
import { useSlidingPanel, PanelConfig } from '../../hooks/useSlidingPanel';
import SlidingPanel from './SlidingPanel';

interface SlidingPanelContextType {
  openPanel: (config: PanelConfig) => void;
  closePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<PanelConfig>) => void;
  closeAllPanels: () => void;
  getPanel: (id: string) => any;
  isPanelOpen: (id: string) => boolean;
}

const SlidingPanelContext = createContext<SlidingPanelContextType | undefined>(undefined);

export const useSlidingPanelContext = () => {
  const context = useContext(SlidingPanelContext);
  if (!context) {
    throw new Error('useSlidingPanelContext must be used within a SlidingPanelProvider');
  }
  return context;
};

interface SlidingPanelProviderProps {
  children: React.ReactNode;
  renderPanelContent?: (panelId: string, data?: any) => React.ReactNode;
}

export const SlidingPanelProvider: React.FC<SlidingPanelProviderProps> = ({
  children,
  renderPanelContent,
}) => {
  const {
    panels,
    openPanel,
    closePanel,
    updatePanel,
    closeAllPanels,
    getPanel,
    isPanelOpen,
  } = useSlidingPanel();

  const defaultRenderContent = (panelId: string, data?: any) => {
    return (
      <div style={{ padding: '24px' }}>
        <h3>Panel Content</h3>
        <p>Panel ID: {panelId}</p>
        {data && (
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '8px',
            fontSize: '12px' 
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  const renderContent = renderPanelContent || defaultRenderContent;

  return (
    <SlidingPanelContext.Provider
      value={{
        openPanel,
        closePanel,
        updatePanel,
        closeAllPanels,
        getPanel,
        isPanelOpen,
      }}
    >
      {children}
      
      {/* Render all open panels */}
      {panels.map((panel) => (
        <SlidingPanel
          key={panel.id}
          open={panel.open}
          onClose={() => closePanel(panel.id)}
          title={panel.title}
          subtitle={panel.subtitle}
          width={panel.width}
          position={panel.position}
          allowFullscreen={panel.allowFullscreen}
          allowDrag={panel.allowDrag}
          showBackdrop={panel.showBackdrop}
          persistent={panel.persistent}
        >
          {renderContent(panel.id, panel.data)}
        </SlidingPanel>
      ))}
    </SlidingPanelContext.Provider>
  );
};