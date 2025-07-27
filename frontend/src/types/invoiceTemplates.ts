export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'classic' | 'minimal' | 'corporate';
  preview: string; // Base64 or URL to preview image
  config: TemplateConfig;
  isDefault?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateConfig {
  layout: {
    type: 'single-column' | 'two-column' | 'split';
    headerHeight: number;
    footerHeight: number;
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textLight: string;
    background: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      title: number;
      heading: number;
      body: number;
      caption: number;
    };
    fontWeight: {
      title: number;
      heading: number;
      body: number;
      caption: number;
    };
  };
  branding: {
    showLogo: boolean;
    logoPosition: 'top-left' | 'top-center' | 'top-right';
    logoSize: 'small' | 'medium' | 'large';
    companyNameStyle: 'below-logo' | 'beside-logo' | 'hidden';
  };
  sections: {
    header: TemplateSection;
    billTo: TemplateSection;
    invoiceDetails: TemplateSection;
    itemsTable: TemplateSection;
    totals: TemplateSection;
    footer: TemplateSection;
  };
}

export interface TemplateSection {
  visible: boolean;
  position: 'left' | 'center' | 'right';
  styling: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    padding?: number;
    margin?: number;
  };
}

export interface InvoiceTemplatePreviewData {
  template: InvoiceTemplate;
  invoiceData: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    company: {
      name: string;
      address: string;
      email: string;
      phone: string;
      logo?: string;
    };
    client: {
      name: string;
      company?: string;
      address: string;
      email: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    notes?: string;
    terms?: string;
  };
}

export interface TemplateCustomization {
  colors?: Partial<TemplateConfig['colors']>;
  typography?: Partial<TemplateConfig['typography']>;
  branding?: Partial<TemplateConfig['branding']>;
  layout?: Partial<TemplateConfig['layout']>;
}

// Predefined template configurations
export const DEFAULT_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    description: 'Clean and contemporary design with blue accents',
    category: 'modern',
    preview: '/templates/modern-blue-preview.png',
    isDefault: true,
    config: {
      layout: {
        type: 'two-column',
        headerHeight: 120,
        footerHeight: 80,
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
      },
      colors: {
        primary: '#1976d2',
        secondary: '#42a5f5',
        accent: '#2196f3',
        text: '#333333',
        textLight: '#666666',
        background: '#ffffff',
        border: '#e0e0e0',
      },
      typography: {
        fontFamily: 'Inter, Helvetica, Arial, sans-serif',
        fontSize: { title: 28, heading: 18, body: 12, caption: 10 },
        fontWeight: { title: 700, heading: 600, body: 400, caption: 400 },
      },
      branding: {
        showLogo: true,
        logoPosition: 'top-left',
        logoSize: 'medium',
        companyNameStyle: 'beside-logo',
      },
      sections: {
        header: { visible: true, position: 'left', styling: {} },
        billTo: { visible: true, position: 'left', styling: {} },
        invoiceDetails: { visible: true, position: 'right', styling: {} },
        itemsTable: { visible: true, position: 'center', styling: {} },
        totals: { visible: true, position: 'right', styling: {} },
        footer: { visible: true, position: 'center', styling: {} },
      },
    },
  },
  {
    id: 'classic-elegant',
    name: 'Classic Elegant',
    description: 'Traditional professional design with serif typography',
    category: 'classic',
    preview: '/templates/classic-elegant-preview.png',
    isDefault: true,
    config: {
      layout: {
        type: 'single-column',
        headerHeight: 140,
        footerHeight: 60,
        margins: { top: 50, right: 50, bottom: 50, left: 50 },
      },
      colors: {
        primary: '#2c3e50',
        secondary: '#34495e',
        accent: '#3498db',
        text: '#2c3e50',
        textLight: '#7f8c8d',
        background: '#ffffff',
        border: '#bdc3c7',
      },
      typography: {
        fontFamily: 'Georgia, Times, serif',
        fontSize: { title: 32, heading: 20, body: 13, caption: 11 },
        fontWeight: { title: 700, heading: 600, body: 400, caption: 400 },
      },
      branding: {
        showLogo: true,
        logoPosition: 'top-center',
        logoSize: 'large',
        companyNameStyle: 'below-logo',
      },
      sections: {
        header: { visible: true, position: 'center', styling: {} },
        billTo: { visible: true, position: 'left', styling: {} },
        invoiceDetails: { visible: true, position: 'right', styling: {} },
        itemsTable: { visible: true, position: 'center', styling: {} },
        totals: { visible: true, position: 'right', styling: {} },
        footer: { visible: true, position: 'center', styling: {} },
      },
    },
  },
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    description: 'Ultra-clean minimalist design with lots of white space',
    category: 'minimal',
    preview: '/templates/minimal-clean-preview.png',
    isDefault: true,
    config: {
      layout: {
        type: 'split',
        headerHeight: 100,
        footerHeight: 40,
        margins: { top: 60, right: 60, bottom: 60, left: 60 },
      },
      colors: {
        primary: '#000000',
        secondary: '#333333',
        accent: '#666666',
        text: '#000000',
        textLight: '#999999',
        background: '#ffffff',
        border: '#f0f0f0',
      },
      typography: {
        fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
        fontSize: { title: 24, heading: 16, body: 11, caption: 9 },
        fontWeight: { title: 300, heading: 400, body: 300, caption: 300 },
      },
      branding: {
        showLogo: false,
        logoPosition: 'top-left',
        logoSize: 'small',
        companyNameStyle: 'beside-logo',
      },
      sections: {
        header: { visible: true, position: 'left', styling: {} },
        billTo: { visible: true, position: 'left', styling: {} },
        invoiceDetails: { visible: true, position: 'right', styling: {} },
        itemsTable: { visible: true, position: 'center', styling: {} },
        totals: { visible: true, position: 'right', styling: {} },
        footer: { visible: true, position: 'center', styling: {} },
      },
    },
  },
  {
    id: 'corporate-professional',
    name: 'Corporate Professional',
    description: 'Bold corporate design with strong branding elements',
    category: 'corporate',
    preview: '/templates/corporate-professional-preview.png',
    isDefault: true,
    config: {
      layout: {
        type: 'two-column',
        headerHeight: 160,
        footerHeight: 100,
        margins: { top: 30, right: 30, bottom: 30, left: 30 },
      },
      colors: {
        primary: '#1a237e',
        secondary: '#3949ab',
        accent: '#5c6bc0',
        text: '#1a237e',
        textLight: '#5c6bc0',
        background: '#ffffff',
        border: '#c5cae9',
      },
      typography: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: { title: 30, heading: 19, body: 12, caption: 10 },
        fontWeight: { title: 700, heading: 700, body: 400, caption: 400 },
      },
      branding: {
        showLogo: true,
        logoPosition: 'top-left',
        logoSize: 'large',
        companyNameStyle: 'beside-logo',
      },
      sections: {
        header: {
          visible: true,
          position: 'left',
          styling: {
            backgroundColor: '#f3f4f6',
            borderColor: '#1a237e',
            borderWidth: 2,
            padding: 20,
          },
        },
        billTo: { visible: true, position: 'left', styling: {} },
        invoiceDetails: { visible: true, position: 'right', styling: {} },
        itemsTable: { visible: true, position: 'center', styling: {} },
        totals: {
          visible: true,
          position: 'right',
          styling: {
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            padding: 15,
          },
        },
        footer: { visible: true, position: 'center', styling: {} },
      },
    },
  },
];

export const SAMPLE_INVOICE_DATA = {
  invoiceNumber: 'INV-2025-001',
  issueDate: '2025-01-27',
  dueDate: '2025-02-26',
  company: {
    name: 'Your Company Name',
    address: '123 Business Street\nCity, State 12345\nUnited States',
    email: 'billing@yourcompany.com',
    phone: '+1 (555) 123-4567',
  },
  client: {
    name: 'Client Name',
    company: 'Client Company Ltd.',
    address: '456 Client Avenue\nClient City, State 67890\nUnited States',
    email: 'contact@clientcompany.com',
  },
  items: [
    {
      description: 'Web Development Services',
      quantity: 40,
      rate: 125.00,
      amount: 5000.00,
    },
    {
      description: 'UI/UX Design Consultation',
      quantity: 8,
      rate: 150.00,
      amount: 1200.00,
    },
    {
      description: 'Project Management',
      quantity: 20,
      rate: 100.00,
      amount: 2000.00,
    },
  ],
  subtotal: 8200.00,
  tax: 656.00,
  total: 8856.00,
  currency: 'USD',
  notes: 'Thank you for your business! Payment is due within 30 days.',
  terms: 'Net 30 days. Late payments may be subject to a 1.5% monthly service charge.',
};