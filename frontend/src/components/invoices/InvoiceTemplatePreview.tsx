import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  styled,
  alpha,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  InvoiceTemplate,
  InvoiceTemplatePreviewData,
  SAMPLE_INVOICE_DATA,
} from '../../types/invoiceTemplates';
import { formatCurrency, formatDate } from '../../services/invoiceService';

interface InvoiceTemplatePreviewProps {
  template: InvoiceTemplate;
  invoiceData?: InvoiceTemplatePreviewData['invoiceData'];
  scale?: number;
  interactive?: boolean;
  className?: string;
}

const PreviewContainer = styled(motion(Paper))<{ scale?: number }>(
  ({ theme, scale = 1 }) => ({
    width: 794 * scale, // A4 width in pixels
    height: 1123 * scale, // A4 height in pixels
    padding: theme.spacing(4) * scale,
    backgroundColor: '#ffffff',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[8],
    transformOrigin: 'top left',
    transform: `scale(${scale})`,
    overflow: 'hidden',
    position: 'relative',
  })
);

const TemplateSection = styled(Box)<{ 
  config: any; 
  section: string;
  scale?: number;
}>(({ theme, config, section, scale = 1 }) => {
  const sectionConfig = config.sections[section];
  return {
    padding: (sectionConfig.styling?.padding || 0) * scale,
    margin: (sectionConfig.styling?.margin || 0) * scale,
    backgroundColor: sectionConfig.styling?.backgroundColor || 'transparent',
    borderColor: sectionConfig.styling?.borderColor || 'transparent',
    borderWidth: (sectionConfig.styling?.borderWidth || 0) * scale,
    borderStyle: sectionConfig.styling?.borderWidth ? 'solid' : 'none',
    borderRadius: (sectionConfig.styling?.borderRadius || 0) * scale,
    textAlign: sectionConfig.position as any,
  };
});

const LogoPlaceholder = styled(Box)<{ size: string; scale?: number }>(
  ({ theme, size, scale = 1 }) => {
    const getSize = () => {
      switch (size) {
        case 'small':
          return 40 * scale;
        case 'large':
          return 80 * scale;
        default:
          return 60 * scale;
      }
    };

    return {
      width: getSize(),
      height: getSize(),
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
      border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
      borderRadius: theme.spacing(1) * scale,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: alpha(theme.palette.primary.main, 0.7),
      fontSize: (12 * scale) + 'px',
      fontWeight: 600,
    };
  }
);

const InvoiceTemplatePreview: React.FC<InvoiceTemplatePreviewProps> = ({
  template,
  invoiceData = SAMPLE_INVOICE_DATA,
  scale = 0.6,
  interactive = false,
  className,
}) => {
  const { config } = template;
  const { colors, typography, branding, layout } = config;

  const getTypographyStyle = (level: keyof typeof typography.fontSize) => ({
    fontFamily: typography.fontFamily,
    fontSize: (typography.fontSize[level] * scale) + 'px',
    fontWeight: typography.fontWeight[level],
    lineHeight: 1.4,
  });

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
  };

  return (
    <Box className={className} sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <PreviewContainer
        scale={scale}
        variants={interactive ? containerVariants : {}}
        initial={interactive ? 'hidden' : false}
        animate={interactive ? 'visible' : false}
        sx={{ color: colors.text }}
      >
        {/* Header Section */}
        {config.sections.header.visible && (
          <TemplateSection 
            config={config} 
            section="header" 
            scale={scale}
            sx={{ mb: 3 * scale }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={branding.logoPosition === 'top-center' ? 12 : 6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: branding.logoPosition === 'top-center' ? 'center' : 
                                 branding.logoPosition === 'top-right' ? 'flex-end' : 'flex-start',
                  gap: 2 * scale,
                  flexDirection: branding.companyNameStyle === 'below-logo' ? 'column' : 'row',
                }}>
                  {branding.showLogo && (
                    <LogoPlaceholder size={branding.logoSize} scale={scale}>
                      LOGO
                    </LogoPlaceholder>
                  )}
                  <Box sx={{ 
                    textAlign: branding.logoPosition === 'top-center' || branding.companyNameStyle === 'below-logo' 
                      ? 'center' : 'left' 
                  }}>
                    <Typography 
                      sx={{ 
                        ...getTypographyStyle('title'),
                        color: colors.primary,
                        mb: 0.5 * scale 
                      }}
                    >
                      {invoiceData.company.name}
                    </Typography>
                    <Typography 
                      sx={{ 
                        ...getTypographyStyle('caption'),
                        color: colors.textLight,
                        whiteSpace: 'pre-line'
                      }}
                    >
                      {invoiceData.company.address}
                    </Typography>
                    <Typography 
                      sx={{ 
                        ...getTypographyStyle('caption'),
                        color: colors.textLight,
                      }}
                    >
                      {invoiceData.company.email} • {invoiceData.company.phone}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {branding.logoPosition !== 'top-center' && (
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography 
                      sx={{ 
                        ...getTypographyStyle('title'),
                        color: colors.primary,
                        mb: 1 * scale 
                      }}
                    >
                      INVOICE
                    </Typography>
                    <Typography sx={{ ...getTypographyStyle('body'), color: colors.textLight }}>
                      Invoice #: {invoiceData.invoiceNumber}
                    </Typography>
                    <Typography sx={{ ...getTypographyStyle('body'), color: colors.textLight }}>
                      Date: {formatDate(invoiceData.issueDate)}
                    </Typography>
                    <Typography sx={{ ...getTypographyStyle('body'), color: colors.textLight }}>
                      Due: {formatDate(invoiceData.dueDate)}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </TemplateSection>
        )}

        <Divider sx={{ my: 3 * scale, borderColor: colors.border }} />

        {/* Bill To Section */}
        {config.sections.billTo.visible && (
          <TemplateSection 
            config={config} 
            section="billTo" 
            scale={scale}
            sx={{ mb: 3 * scale }}
          >
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Typography 
                  sx={{ 
                    ...getTypographyStyle('heading'),
                    color: colors.primary,
                    mb: 1 * scale 
                  }}
                >
                  Bill To:
                </Typography>
                <Typography sx={{ ...getTypographyStyle('body'), mb: 0.5 * scale }}>
                  {invoiceData.client.name}
                </Typography>
                {invoiceData.client.company && (
                  <Typography sx={{ ...getTypographyStyle('body'), mb: 0.5 * scale }}>
                    {invoiceData.client.company}
                  </Typography>
                )}
                <Typography 
                  sx={{ 
                    ...getTypographyStyle('caption'),
                    color: colors.textLight,
                    whiteSpace: 'pre-line'
                  }}
                >
                  {invoiceData.client.address}
                </Typography>
                <Typography 
                  sx={{ 
                    ...getTypographyStyle('caption'),
                    color: colors.textLight
                  }}
                >
                  {invoiceData.client.email}
                </Typography>
              </Grid>
            </Grid>
          </TemplateSection>
        )}

        {/* Items Table */}
        {config.sections.itemsTable.visible && (
          <TemplateSection 
            config={config} 
            section="itemsTable" 
            scale={scale}
            sx={{ mb: 3 * scale }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: alpha(colors.primary, 0.1) }}>
                    <TableCell sx={{ 
                      ...getTypographyStyle('heading'),
                      color: colors.primary,
                      borderColor: colors.border,
                      py: 1 * scale,
                    }}>
                      Description
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        ...getTypographyStyle('heading'),
                        color: colors.primary,
                        borderColor: colors.border,
                        py: 1 * scale,
                      }}
                    >
                      Qty
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        ...getTypographyStyle('heading'),
                        color: colors.primary,
                        borderColor: colors.border,
                        py: 1 * scale,
                      }}
                    >
                      Rate
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        ...getTypographyStyle('heading'),
                        color: colors.primary,
                        borderColor: colors.border,
                        py: 1 * scale,
                      }}
                    >
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ 
                        ...getTypographyStyle('body'),
                        borderColor: colors.border,
                        py: 1 * scale,
                      }}>
                        {item.description}
                      </TableCell>
                      <TableCell 
                        align="center"
                        sx={{ 
                          ...getTypographyStyle('body'),
                          borderColor: colors.border,
                          py: 1 * scale,
                        }}
                      >
                        {item.quantity}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          ...getTypographyStyle('body'),
                          borderColor: colors.border,
                          py: 1 * scale,
                        }}
                      >
                        {formatCurrency(item.rate, invoiceData.currency)}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          ...getTypographyStyle('body'),
                          borderColor: colors.border,
                          py: 1 * scale,
                        }}
                      >
                        {formatCurrency(item.amount, invoiceData.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TemplateSection>
        )}

        {/* Totals Section */}
        {config.sections.totals.visible && (
          <TemplateSection 
            config={config} 
            section="totals" 
            scale={scale}
            sx={{ mb: 3 * scale }}
          >
            <Grid container justifyContent="flex-end">
              <Grid item xs={6} md={4}>
                <Box sx={{ 
                  border: `1px solid ${colors.border}`,
                  borderRadius: 1 * scale,
                  p: 2 * scale,
                  backgroundColor: alpha(colors.background, 0.5),
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 * scale }}>
                    <Typography sx={{ ...getTypographyStyle('body') }}>
                      Subtotal:
                    </Typography>
                    <Typography sx={{ ...getTypographyStyle('body') }}>
                      {formatCurrency(invoiceData.subtotal, invoiceData.currency)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 * scale }}>
                    <Typography sx={{ ...getTypographyStyle('body') }}>
                      Tax:
                    </Typography>
                    <Typography sx={{ ...getTypographyStyle('body') }}>
                      {formatCurrency(invoiceData.tax, invoiceData.currency)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 * scale, borderColor: colors.border }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ 
                      ...getTypographyStyle('heading'),
                      color: colors.primary 
                    }}>
                      Total:
                    </Typography>
                    <Typography sx={{ 
                      ...getTypographyStyle('heading'),
                      color: colors.primary 
                    }}>
                      {formatCurrency(invoiceData.total, invoiceData.currency)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </TemplateSection>
        )}

        {/* Footer Section */}
        {config.sections.footer.visible && (
          <TemplateSection 
            config={config} 
            section="footer" 
            scale={scale}
            sx={{ mt: 'auto', pt: 3 * scale }}
          >
            {invoiceData.notes && (
              <Box sx={{ mb: 2 * scale }}>
                <Typography sx={{ 
                  ...getTypographyStyle('heading'),
                  color: colors.primary,
                  mb: 1 * scale 
                }}>
                  Notes:
                </Typography>
                <Typography sx={{ 
                  ...getTypographyStyle('body'),
                  color: colors.textLight 
                }}>
                  {invoiceData.notes}
                </Typography>
              </Box>
            )}
            
            {invoiceData.terms && (
              <Box>
                <Typography sx={{ 
                  ...getTypographyStyle('heading'),
                  color: colors.primary,
                  mb: 1 * scale 
                }}>
                  Terms & Conditions:
                </Typography>
                <Typography sx={{ 
                  ...getTypographyStyle('caption'),
                  color: colors.textLight 
                }}>
                  {invoiceData.terms}
                </Typography>
              </Box>
            )}
          </TemplateSection>
        )}
      </PreviewContainer>
    </Box>
  );
};

export default InvoiceTemplatePreview;