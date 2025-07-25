import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { PDFService } from './pdfService';
import { InvoiceDetail } from '../types/invoice';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface CompanyInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

export class EmailService {
  private transporter!: nodemailer.Transporter;
  private templateCache: Map<string, string> = new Map();

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with configuration
   */
  private initializeTransporter() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  /**
   * Load and cache email template
   */
  private async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
    
    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      this.templateCache.set(templateName, templateContent);
      return templateContent;
    } catch (error) {
      console.error(`Failed to load email template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  /**
   * Replace template variables with actual data
   */
  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let html = template;

    // Replace all variables
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, variables[key] || '');
    });

    // Process conditional blocks
    const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    html = html.replace(ifRegex, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return html;
  }

  /**
   * Generate email template for invoice delivery
   */
  private async generateInvoiceEmailTemplate(
    invoice: InvoiceDetail,
    companyInfo: CompanyInfo
  ): Promise<EmailTemplate> {
    const template = await this.loadTemplate('invoice-delivery');
    
    const variables = {
      clientName: invoice.client.name,
      companyName: companyInfo.companyName,
      companyEmail: companyInfo.companyEmail,
      companyPhone: companyInfo.companyPhone,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount.toFixed(2),
      dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      orderDescription: invoice.order?.description || 'Manual Invoice',
      currentYear: new Date().getFullYear(),
    };

    const html = this.replaceTemplateVariables(template, variables);
    
    // Generate plain text version
    const text = `
Dear ${variables.clientName},

We hope this email finds you well. Please find attached your invoice ${variables.invoiceNumber} from ${variables.companyName}.

Invoice Details:
- Invoice Number: ${variables.invoiceNumber}
- Amount: $${variables.amount}
- Due Date: ${variables.dueDate}
- Service: ${variables.orderDescription}

Please review the attached PDF invoice and process payment by the due date. If you have any questions or concerns, please don't hesitate to contact us.

Thank you for your business!

Best regards,
${variables.companyName}
${variables.companyEmail}
${variables.companyPhone}
    `.trim();

    return {
      subject: `Invoice ${variables.invoiceNumber} from ${variables.companyName}`,
      html,
      text,
    };
  }

  /**
   * Send invoice via email with PDF attachment
   */
  async sendInvoiceEmail(invoice: InvoiceDetail): Promise<boolean> {
    try {
      // Get company information
      const companyInfo = PDFService.getDefaultCompanyInfo();

      // Generate PDF
      const pdfBuffer = await PDFService.generateInvoicePDF(invoice, companyInfo, {
        paymentTerms: 30,
        paymentInstructions: `Please send payment to ${companyInfo.companyEmail} or call ${companyInfo.companyPhone}`,
      });

      // Generate email template
      const emailTemplate = await this.generateInvoiceEmailTemplate(invoice, companyInfo);

      // Prepare email options
      const emailOptions: EmailOptions = {
        to: invoice.client.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        attachments: [
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      // Send email
      await this.sendEmail(emailOptions);
      console.log(`Invoice ${invoice.invoiceNumber} sent successfully to ${invoice.client.email}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to send invoice ${invoice.invoiceNumber}:`, error);
      throw new Error(`Failed to send invoice email: ${error}`);
    }
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(
    invoice: InvoiceDetail,
    reminderType: 'before_due' | 'due_today' | 'overdue'
  ): Promise<boolean> {
    try {
      const companyInfo = PDFService.getDefaultCompanyInfo();
      const template = await this.loadTemplate('payment-reminder');

      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      let subjectPrefix = '';
      let reminderMessage = '';

      switch (reminderType) {
        case 'before_due':
          subjectPrefix = 'Friendly Reminder: ';
          reminderMessage = 'This is a friendly reminder that your invoice is due soon.';
          break;
        case 'due_today':
          subjectPrefix = 'Due Today: ';
          reminderMessage = 'This invoice is due today. Please process payment as soon as possible.';
          break;
        case 'overdue':
          subjectPrefix = 'Overdue Notice: ';
          reminderMessage = `This invoice is ${Math.abs(daysOverdue)} days overdue. Please process payment immediately to avoid any service interruption.`;
          break;
      }

      const variables = {
        clientName: invoice.client.name,
        companyName: companyInfo.companyName,
        companyEmail: companyInfo.companyEmail,
        companyPhone: companyInfo.companyPhone,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount.toFixed(2),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        reminderMessage,
        currentYear: new Date().getFullYear(),
      };

      const html = this.replaceTemplateVariables(template, variables);
      
      const text = `
Dear ${variables.clientName},

${reminderMessage}

Invoice Details:
- Invoice Number: ${variables.invoiceNumber}
- Amount: $${variables.amount}
- Due Date: ${variables.dueDate}

Please process payment as soon as possible. If you have any questions, please contact us.

Best regards,
${variables.companyName}
${variables.companyEmail}
${variables.companyPhone}
      `.trim();

      const emailOptions: EmailOptions = {
        to: invoice.client.email,
        subject: `${subjectPrefix}Invoice ${invoice.invoiceNumber} - $${variables.amount}`,
        html,
        text,
      };

      await this.sendEmail(emailOptions);
      console.log(`Payment reminder sent for invoice ${invoice.invoiceNumber}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to send payment reminder for invoice ${invoice.invoiceNumber}:`, error);
      throw new Error(`Failed to send payment reminder: ${error}`);
    }
  }

  /**
   * Send basic email
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Invoice System'} <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      const testEmailOptions: EmailOptions = {
        to,
        subject: 'Test Email from Invoice System',
        text: 'This is a test email to verify email configuration.',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email to verify that the email system is working correctly.</p>
          <p>If you received this email, the configuration is working!</p>
          <hr>
          <p><small>Sent from the Invoice Management System</small></p>
        `,
      };

      await this.sendEmail(testEmailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send test email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();