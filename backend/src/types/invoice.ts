export interface InvoiceDetail {
  id: string;
  orderId: string | null;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  sentDate?: string;
  paidDate?: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
  };
  order: {
    id: string;
    description: string;
    frequency: string;
    status: string;
  } | null;
}