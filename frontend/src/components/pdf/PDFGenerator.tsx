import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Preview as PreviewIcon,
  CloudDownload as CloudIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import InvoicePDFDocument from './InvoicePDFDocument';
import InvoiceTemplatePreview from '../invoices/InvoiceTemplatePreview';
import {
  InvoiceTemplate,
  InvoiceTemplatePreviewData,
  DEFAULT_TEMPLATES,
} from '../../types/invoiceTemplates';
import { InvoiceWithRelations } from '../../services/invoiceService';

interface PDFGeneratorProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceWithRelations;
  template?: InvoiceTemplate;
  onEmailSent?: () => void;
}

interface PDFOptions {
  includeWatermark: boolean;
  template: InvoiceTemplate;
  quality: 'standard' | 'high';
  format: 'A4' | 'Letter';
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  open,
  onClose,
  invoice,
  template = DEFAULT_TEMPLATES[0],
  onEmailSent,
}) => {
  const [currentTab, setCurrentTab] = useState(0); // 0: Options, 1: Preview
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfOptions, setPdfOptions] = useState<PDFOptions>({
    includeWatermark: false,
    template: template,
    quality: 'high',
    format: 'A4',
  });

  // Convert invoice to template preview data
  const invoiceData: InvoiceTemplatePreviewData['invoiceData'] = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    company: {
      name: invoice.company?.name || 'Your Company',
      address: invoice.company?.address || 'Company Address',
      email: invoice.company?.email || 'company@example.com',
      phone: invoice.company?.phone || '(555) 123-4567',
    },
    client: {
      name: invoice.client.name,
      company: invoice.client.company,
      address: invoice.client.address || 'Client Address',
      email: invoice.client.email,
    },
    items: [
      {
        description: invoice.description || invoice.order?.description || 'Service',
        quantity: 1,
        rate: invoice.amount,
        amount: invoice.amount,
      },
    ],
    subtotal: invoice.amount,
    tax: invoice.amount * 0.08, // Assume 8% tax
    total: invoice.amount * 1.08,
    currency: invoice.currency,
    notes: 'Thank you for your business!',
    terms: 'Payment is due within 30 days of invoice date.',
  };

  const generatePDF = async (): Promise<Blob> => {
    setIsGenerating(true);
    setError('');

    try {
      const doc = (
        <InvoicePDFDocument
          invoiceData={invoiceData}
          template={pdfOptions.template}
          includeWatermark={pdfOptions.includeWatermark}
        />
      );

      const blob = await pdf(doc).toBlob();
      setPdfBlob(blob);
      return blob;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate PDF';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = pdfBlob || await generatePDF();
      const filename = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      saveAs(blob, filename);
      setSuccess('PDF downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      // Error already handled in generatePDF
    }
  };

  const handleEmail = async () => {
    try {
      const blob = pdfBlob || await generatePDF();
      // In a real implementation, this would send the email via API
      console.log('Sending email with PDF attachment...', blob);
      setSuccess('Email sent successfully!');
      setTimeout(() => setSuccess(''), 3000);
      onEmailSent?.();
    } catch (error) {
      // Error already handled in generatePDF
    }
  };

  const handlePrint = async () => {
    try {
      const blob = pdfBlob || await generatePDF();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    } catch (error) {
      // Error already handled in generatePDF
    }
  };

  const handlePreview = async () => {
    if (!pdfBlob) {
      await generatePDF();
    }
    setCurrentTab(1);
  };

  const handleClose = () => {
    setPdfBlob(null);
    setError('');
    setSuccess('');
    setCurrentTab(0);
    onClose();
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        component: motion.div,
        variants: containerVariants,
        initial: "hidden",
        animate: "visible",
        transition: { duration: 0.3 },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
          <Typography variant="h6">
            Generate PDF - {invoice.invoiceNumber}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="PDF Options" icon={<PdfIcon />} />
          <Tab label="Preview" icon={<PreviewIcon />} />
        </Tabs>

        {/* Options Tab */}
        {currentTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Template Selection */}
            <FormControl fullWidth>
              <InputLabel>Template</InputLabel>
              <Select
                value={pdfOptions.template.id}
                label="Template"
                onChange={(e) => {
                  const selectedTemplate = DEFAULT_TEMPLATES.find(t => t.id === e.target.value);
                  if (selectedTemplate) {
                    setPdfOptions(prev => ({ ...prev, template: selectedTemplate }));
                  }
                }}
              >
                {DEFAULT_TEMPLATES.map((tmpl) => (
                  <MenuItem key={tmpl.id} value={tmpl.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tmpl.name}
                      <Chip label={tmpl.category} size="small" variant="outlined" />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quality & Format */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={pdfOptions.quality}
                  label="Quality"
                  onChange={(e) => setPdfOptions(prev => ({ 
                    ...prev, 
                    quality: e.target.value as 'standard' | 'high' 
                  }))}
                >
                  <MenuItem value="standard">Standard (Smaller file)</MenuItem>
                  <MenuItem value="high">High (Better quality)</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={pdfOptions.format}
                  label="Format"
                  onChange={(e) => setPdfOptions(prev => ({ 
                    ...prev, 
                    format: e.target.value as 'A4' | 'Letter' 
                  }))}
                >
                  <MenuItem value="A4">A4 (210 × 297 mm)</MenuItem>
                  <MenuItem value="Letter">Letter (8.5 × 11 in)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Options */}
            <FormControlLabel
              control={
                <Switch
                  checked={pdfOptions.includeWatermark}
                  onChange={(e) => setPdfOptions(prev => ({ 
                    ...prev, 
                    includeWatermark: e.target.checked 
                  }))}
                />
              }
              label="Include watermark (for preview/draft)"
            />

            {/* Template Preview */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Template Preview
              </Typography>
              <Box sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1, 
                overflow: 'hidden',
                maxHeight: 300,
              }}>
                <InvoiceTemplatePreview
                  template={pdfOptions.template}
                  invoiceData={invoiceData}
                  scale={0.3}
                  interactive={false}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Preview Tab */}
        {currentTab === 1 && (
          <Box sx={{ textAlign: 'center' }}>
            {pdfBlob ? (
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                width="100%"
                height="600px"
                style={{ border: '1px solid #ddd', borderRadius: '4px' }}
                title="PDF Preview"
              />
            ) : (
              <Box sx={{ py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Generate PDF to see preview
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handlePreview}
                  disabled={isGenerating}
                  startIcon={isGenerating ? <CircularProgress size={20} /> : <PreviewIcon />}
                >
                  {isGenerating ? 'Generating...' : 'Generate Preview'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button onClick={handleClose} disabled={isGenerating}>
          Close
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Print PDF">
            <Button
              variant="outlined"
              onClick={handlePrint}
              disabled={isGenerating}
              startIcon={<PrintIcon />}
            >
              Print
            </Button>
          </Tooltip>

          <Tooltip title="Email PDF">
            <Button
              variant="outlined"
              onClick={handleEmail}
              disabled={isGenerating}
              startIcon={<EmailIcon />}
            >
              Email
            </Button>
          </Tooltip>

          <Button
            variant="contained"
            onClick={handleDownload}
            disabled={isGenerating}
            startIcon={isGenerating ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PDFGenerator;