import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { InvoiceDetail } from '../types/invoice';

interface CompanyInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

interface InvoicePdfData extends InvoiceDetail {
  companyInfo: CompanyInfo;
  paymentTerms: number;
  paymentInstructions?: string;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
}

export class PDFService {
  private static templateCache: Map<string, string> = new Map();

  /**
   * Load and cache HTML template
   */
  private static async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    this.templateCache.set(templateName, templateContent);
    return templateContent;
  }

  /**
   * Replace template variables with actual data
   */
  private static replaceTemplateVariables(template: string, data: InvoicePdfData): string {
    // Helper function to format dates
    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Helper function to get status class for CSS
    const getStatusClass = (status: string): string => {
      return status.toLowerCase();
    };

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return amount.toFixed(2);
    };

    // Replace all template variables
    let html = template
      // Company information
      .replace(/\{\{companyName\}\}/g, data.companyInfo.companyName)
      .replace(/\{\{companyAddress\}\}/g, data.companyInfo.companyAddress)
      .replace(/\{\{companyPhone\}\}/g, data.companyInfo.companyPhone)
      .replace(/\{\{companyEmail\}\}/g, data.companyInfo.companyEmail)
      
      // Invoice details
      .replace(/\{\{invoiceNumber\}\}/g, data.invoiceNumber)
      .replace(/\{\{issueDate\}\}/g, formatDate(data.issueDate))
      .replace(/\{\{dueDate\}\}/g, formatDate(data.dueDate))
      .replace(/\{\{status\}\}/g, data.status)
      .replace(/\{\{statusClass\}\}/g, getStatusClass(data.status))
      
      // Client information
      .replace(/\{\{clientName\}\}/g, data.client.name)
      .replace(/\{\{clientEmail\}\}/g, data.client.email)
      .replace(/\{\{clientCompany\}\}/g, data.client.company || '')
      .replace(/\{\{clientPhone\}\}/g, data.client.phone || '')
      .replace(/\{\{clientAddress\}\}/g, data.client.address || '')
      
      // Order information  
      .replace(/\{\{orderDescription\}\}/g, data.order?.description || 'Manual Invoice')
      .replace(/\{\{orderFrequency\}\}/g, data.order?.frequency || 'One-time')
      
      // Financial information
      .replace(/\{\{amount\}\}/g, formatCurrency(data.amount))
      .replace(/\{\{totalAmount\}\}/g, formatCurrency(data.totalAmount))
      
      // Payment information
      .replace(/\{\{paymentTerms\}\}/g, data.paymentTerms.toString())
      .replace(/\{\{paymentInstructions\}\}/g, data.paymentInstructions || '');

    // Handle optional dates
    if (data.sentDate) {
      html = html.replace(/\{\{sentDate\}\}/g, formatDate(data.sentDate));
    }
    
    if (data.paidDate) {
      html = html.replace(/\{\{paidDate\}\}/g, formatDate(data.paidDate));
    }

    // Handle tax information
    if (data.taxRate && data.taxAmount) {
      html = html
        .replace(/\{\{taxRate\}\}/g, data.taxRate.toString())
        .replace(/\{\{taxAmount\}\}/g, formatCurrency(data.taxAmount));
    }

    // Handle conditional content (Handlebars-style helpers)
    html = this.processConditionals(html, data);

    return html;
  }

  /**
   * Process conditional blocks in template
   */
  private static processConditionals(html: string, data: any): string {
    // Handle {{#if condition}} blocks
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    html = html.replace(ifRegex, (match, condition, content) => {
      const value = this.getNestedProperty(data, condition);
      return value ? content : '';
    });

    return html;
  }

  /**
   * Get nested property from object (e.g., 'client.company')
   */
  private static getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate PDF from invoice data
   */
  static async generateInvoicePDF(
    invoiceData: InvoiceDetail,
    companyInfo: CompanyInfo,
    options: {
      paymentTerms?: number;
      paymentInstructions?: string;
      taxRate?: number;
      outputPath?: string;
    } = {}
  ): Promise<Buffer> {
    try {
      // Prepare PDF data
      const pdfData: InvoicePdfData = {
        ...invoiceData,
        companyInfo,
        paymentTerms: options.paymentTerms || 30,
        paymentInstructions: options.paymentInstructions,
        taxRate: options.taxRate,
        taxAmount: options.taxRate ? invoiceData.amount * (options.taxRate / 100) : undefined,
        totalAmount: options.taxRate 
          ? invoiceData.amount * (1 + options.taxRate / 100)
          : invoiceData.amount,
      };

      // Load and process template
      const template = await this.loadTemplate('invoice');
      const html = this.replaceTemplateVariables(template, pdfData);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px',
        },
      });

      await browser.close();

      // Save to file if output path is provided
      if (options.outputPath) {
        await fs.writeFile(options.outputPath, pdfBuffer);
      }

      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Generate PDF file path for an invoice
   */
  static getInvoicePdfPath(invoiceNumber: string): string {
    const fileName = `${invoiceNumber}.pdf`;
    return path.join(process.cwd(), 'storage', 'invoices', fileName);
  }

  /**
   * Ensure storage directory exists
   */
  static async ensureStorageDirectory(): Promise<void> {
    const storageDir = path.join(process.cwd(), 'storage', 'invoices');
    
    try {
      await fs.access(storageDir);
    } catch {
      await fs.mkdir(storageDir, { recursive: true });
    }
  }

  /**
   * Get default company information
   * In a real application, this would come from settings/configuration
   */
  static getDefaultCompanyInfo(): CompanyInfo {
    return {
      companyName: process.env.COMPANY_NAME || 'Your Company Name',
      companyAddress: process.env.COMPANY_ADDRESS || '123 Business St, City, State 12345',
      companyPhone: process.env.COMPANY_PHONE || '(555) 123-4567',
      companyEmail: process.env.COMPANY_EMAIL || 'billing@yourcompany.com',
    };
  }
}