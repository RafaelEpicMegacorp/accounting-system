import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import {
  InvoiceTemplate,
  InvoiceTemplatePreviewData,
} from '../../types/invoiceTemplates';
import { formatCurrency } from '../../services/invoiceService';

interface InvoicePDFDocumentProps {
  invoiceData: InvoiceTemplatePreviewData['invoiceData'];
  template: InvoiceTemplate;
  includeWatermark?: boolean;
}

// Register fonts (you would need to add actual font files)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf',
// });

// Font.register({
//   family: 'Inter-Bold',
//   src: '/fonts/Inter-Bold.ttf',
// });

const createStyles = (template: InvoiceTemplate) => {
  const { colors, typography } = template.config;
  
  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: colors.background,
      padding: template.config.layout.margins.top,
      fontFamily: typography.fontFamily.includes('Inter') ? 'Inter' : 'Helvetica',
      fontSize: typography.fontSize.body,
      color: colors.text,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 30,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logoSection: {
      flexDirection: template.config.branding.companyNameStyle === 'below-logo' ? 'column' : 'row',
      alignItems: template.config.branding.logoPosition === 'top-center' ? 'center' : 'flex-start',
    },
    companyName: {
      fontSize: typography.fontSize.title,
      fontWeight: typography.fontWeight.title,
      color: colors.primary,
      marginBottom: 8,
    },
    companyDetails: {
      fontSize: typography.fontSize.caption,
      color: colors.textLight,
      lineHeight: 1.4,
    },
    invoiceTitle: {
      fontSize: typography.fontSize.title,
      fontWeight: typography.fontWeight.title,
      color: colors.primary,
      marginBottom: 10,
      textAlign: 'right',
    },
    invoiceDetails: {
      fontSize: typography.fontSize.body,
      color: colors.textLight,
      textAlign: 'right',
      lineHeight: 1.4,
    },
    billToSection: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: typography.fontSize.heading,
      fontWeight: typography.fontWeight.heading,
      color: colors.primary,
      marginBottom: 10,
    },
    clientDetails: {
      fontSize: typography.fontSize.body,
      color: colors.text,
      lineHeight: 1.4,
    },
    table: {
      display: 'table',
      width: 'auto',
      borderStyle: 'solid',
      borderColor: colors.border,
      borderWidth: 1,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      marginBottom: 30,
    },
    tableRow: {
      margin: 'auto',
      flexDirection: 'row',
    },
    tableHeader: {
      backgroundColor: colors.primary,
      color: colors.background,
    },
    tableCol: {
      width: '25%',
      borderStyle: 'solid',
      borderColor: colors.border,
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 8,
    },
    tableCell: {
      fontSize: typography.fontSize.body,
      textAlign: 'left',
    },
    tableCellRight: {
      fontSize: typography.fontSize.body,
      textAlign: 'right',
    },
    tableCellCenter: {
      fontSize: typography.fontSize.body,
      textAlign: 'center',
    },
    tableColDescription: {
      width: '40%',
      borderStyle: 'solid',
      borderColor: colors.border,
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 8,
    },
    tableColQuantity: {
      width: '20%',
      borderStyle: 'solid',
      borderColor: colors.border,
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 8,
    },
    tableColRate: {
      width: '20%',
      borderStyle: 'solid',
      borderColor: colors.border,
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 8,
    },
    tableColAmount: {
      width: '20%',
      borderStyle: 'solid',
      borderColor: colors.border,
      borderWidth: 1,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      padding: 8,
    },
    totalsSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 30,
    },
    totalsBox: {
      width: '40%',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'solid',
      padding: 15,
      backgroundColor: template.config.sections.totals.styling?.backgroundColor || 'transparent',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: typography.fontSize.body,
      color: colors.text,
    },
    totalAmount: {
      fontSize: typography.fontSize.body,
      color: colors.text,
      fontWeight: 'bold',
    },
    finalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    finalTotalLabel: {
      fontSize: typography.fontSize.heading,
      color: colors.primary,
      fontWeight: typography.fontWeight.heading,
    },
    finalTotalAmount: {
      fontSize: typography.fontSize.heading,
      color: colors.primary,
      fontWeight: typography.fontWeight.heading,
    },
    footer: {
      marginTop: 'auto',
      paddingTop: 30,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notesSection: {
      marginBottom: 20,
    },
    termsSection: {
      marginBottom: 20,
    },
    footerText: {
      fontSize: typography.fontSize.caption,
      color: colors.textLight,
      lineHeight: 1.4,
    },
    watermark: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'rotate(-45deg)',
      fontSize: 60,
      color: colors.border,
      opacity: 0.1,
      zIndex: -1,
    },
  });
};

const InvoicePDFDocument: React.FC<InvoicePDFDocumentProps> = ({
  invoiceData,
  template,
  includeWatermark = false,
}) => {
  const styles = createStyles(template);
  const { config } = template;

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {includeWatermark && (
          <Text style={styles.watermark}>PREVIEW</Text>
        )}

        {/* Header Section */}
        {config.sections.header.visible && (
          <View style={styles.header}>
            <View style={styles.logoSection}>
              {config.branding.showLogo && (
                <View style={{ width: 60, height: 60, backgroundColor: template.config.colors.primary, marginBottom: 10, marginRight: 15 }} />
              )}
              <View>
                <Text style={styles.companyName}>{invoiceData.company.name}</Text>
                <Text style={styles.companyDetails}>{invoiceData.company.address}</Text>
                <Text style={styles.companyDetails}>
                  {invoiceData.company.email} • {invoiceData.company.phone}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceDetails}>Invoice #: {invoiceData.invoiceNumber}</Text>
              <Text style={styles.invoiceDetails}>Date: {formatDate(invoiceData.issueDate)}</Text>
              <Text style={styles.invoiceDetails}>Due: {formatDate(invoiceData.dueDate)}</Text>
            </View>
          </View>
        )}

        {/* Bill To Section */}
        {config.sections.billTo.visible && (
          <View style={styles.billToSection}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={styles.clientDetails}>{invoiceData.client.name}</Text>
            {invoiceData.client.company && (
              <Text style={styles.clientDetails}>{invoiceData.client.company}</Text>
            )}
            <Text style={styles.clientDetails}>{invoiceData.client.address}</Text>
            <Text style={styles.clientDetails}>{invoiceData.client.email}</Text>
          </View>
        )}

        {/* Items Table */}
        {config.sections.itemsTable.visible && (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableColDescription}>
                <Text style={styles.tableCell}>Description</Text>
              </View>
              <View style={styles.tableColQuantity}>
                <Text style={styles.tableCellCenter}>Qty</Text>
              </View>
              <View style={styles.tableColRate}>
                <Text style={styles.tableCellRight}>Rate</Text>
              </View>
              <View style={styles.tableColAmount}>
                <Text style={styles.tableCellRight}>Amount</Text>
              </View>
            </View>

            {/* Table Rows */}
            {invoiceData.items.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <View style={styles.tableColDescription}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                </View>
                <View style={styles.tableColQuantity}>
                  <Text style={styles.tableCellCenter}>{item.quantity}</Text>
                </View>
                <View style={styles.tableColRate}>
                  <Text style={styles.tableCellRight}>
                    {formatCurrency(item.rate, invoiceData.currency)}
                  </Text>
                </View>
                <View style={styles.tableColAmount}>
                  <Text style={styles.tableCellRight}>
                    {formatCurrency(item.amount, invoiceData.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Totals Section */}
        {config.sections.totals.visible && (
          <View style={styles.totalsSection}>
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(invoiceData.subtotal, invoiceData.currency)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(invoiceData.tax, invoiceData.currency)}
                </Text>
              </View>
              <View style={styles.finalTotalRow}>
                <Text style={styles.finalTotalLabel}>Total:</Text>
                <Text style={styles.finalTotalAmount}>
                  {formatCurrency(invoiceData.total, invoiceData.currency)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer Section */}
        {config.sections.footer.visible && (
          <View style={styles.footer}>
            {invoiceData.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Notes:</Text>
                <Text style={styles.footerText}>{invoiceData.notes}</Text>
              </View>
            )}
            {invoiceData.terms && (
              <View style={styles.termsSection}>
                <Text style={styles.sectionTitle}>Terms & Conditions:</Text>
                <Text style={styles.footerText}>{invoiceData.terms}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default InvoicePDFDocument;