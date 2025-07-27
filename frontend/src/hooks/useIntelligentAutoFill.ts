import { useState, useEffect, useCallback } from 'react';
import { Client } from '../services/clientService';
import { OrderWithClient } from '../services/orderService';
import { InvoiceWithRelations, InvoiceFormData } from '../services/invoiceService';
import { ServiceLibrary } from '../services/serviceLibraryService';

interface ClientHistory {
  clientId: string;
  averageAmount: number;
  mostCommonCurrency: string;
  mostCommonServices: string[];
  averagePaymentDays: number;
  lastInvoiceAmount: number;
  frequentDescriptions: string[];
  paymentPatterns: {
    daysToPayment: number;
    frequency: number;
  }[];
}

interface AutoFillSuggestion {
  field: keyof InvoiceFormData;
  value: any;
  confidence: number; // 0-1
  reason: string;
}

interface IntelligentAutoFillOptions {
  enableClientHistory: boolean;
  enableServiceSuggestions: boolean;
  enableAmountPrediction: boolean;
  enableDateSuggestions: boolean;
  minConfidence: number;
}

interface UseIntelligentAutoFillReturn {
  suggestions: AutoFillSuggestion[];
  applySuggestion: (suggestion: AutoFillSuggestion) => void;
  applyAllSuggestions: () => void;
  clearSuggestions: () => void;
  isLoading: boolean;
  clientHistory: ClientHistory | null;
  lastUsedData: Partial<InvoiceFormData> | null;
}

const DEFAULT_OPTIONS: IntelligentAutoFillOptions = {
  enableClientHistory: true,
  enableServiceSuggestions: true,
  enableAmountPrediction: true,
  enableDateSuggestions: true,
  minConfidence: 0.6,
};

// Storage keys for persistence
const STORAGE_KEYS = {
  CLIENT_HISTORY: 'invoice_client_history',
  LAST_FORM_DATA: 'invoice_last_form_data',
  COMMON_SERVICES: 'invoice_common_services',
  AMOUNT_PATTERNS: 'invoice_amount_patterns',
};

export const useIntelligentAutoFill = (
  selectedClient: Client | null,
  selectedOrder: OrderWithClient | null,
  currentFormData: Partial<InvoiceFormData>,
  invoiceHistory: InvoiceWithRelations[] = [],
  services: ServiceLibrary[] = [],
  options: Partial<IntelligentAutoFillOptions> = {}
): UseIntelligentAutoFillReturn => {
  const [suggestions, setSuggestions] = useState<AutoFillSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [clientHistory, setClientHistory] = useState<ClientHistory | null>(null);
  const [lastUsedData, setLastUsedData] = useState<Partial<InvoiceFormData> | null>(null);

  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  // Load stored data
  useEffect(() => {
    const storedLastData = localStorage.getItem(STORAGE_KEYS.LAST_FORM_DATA);
    if (storedLastData) {
      try {
        setLastUsedData(JSON.parse(storedLastData));
      } catch (error) {
        console.warn('Failed to parse stored form data:', error);
      }
    }
  }, []);

  // Save form data when it changes
  useEffect(() => {
    if (Object.keys(currentFormData).length > 0) {
      localStorage.setItem(STORAGE_KEYS.LAST_FORM_DATA, JSON.stringify(currentFormData));
      setLastUsedData(currentFormData);
    }
  }, [currentFormData]);

  // Build client history when client changes
  const buildClientHistory = useCallback((client: Client): ClientHistory | null => {
    if (!client || invoiceHistory.length === 0) return null;

    const clientInvoices = invoiceHistory.filter(inv => inv.clientId === client.id);
    if (clientInvoices.length === 0) return null;

    // Calculate statistics
    const amounts = clientInvoices.map(inv => inv.amount);
    const currencies = clientInvoices.map(inv => inv.currency);
    const descriptions = clientInvoices.map(inv => inv.description || '').filter(Boolean);
    
    // Payment patterns (mock data - would come from actual payment history)
    const paymentPatterns = clientInvoices.map(inv => ({
      daysToPayment: Math.floor(Math.random() * 30) + 5, // Mock data
      frequency: 1,
    }));

    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const mostCommonCurrency = currencies.reduce((a, b, i, arr) => 
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
    );

    // Extract common service descriptions
    const descriptionWords = descriptions.flatMap(desc => 
      desc.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    );
    const wordFreq = descriptionWords.reduce((freq, word) => {
      freq[word] = (freq[word] || 0) + 1;
      return freq;
    }, {} as Record<string, number>);
    
    const mostCommonServices = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    const history: ClientHistory = {
      clientId: client.id,
      averageAmount,
      mostCommonCurrency,
      mostCommonServices,
      averagePaymentDays: paymentPatterns.reduce((sum, p) => sum + p.daysToPayment, 0) / paymentPatterns.length,
      lastInvoiceAmount: amounts[amounts.length - 1] || 0,
      frequentDescriptions: descriptions.slice(0, 3),
      paymentPatterns,
    };

    // Store in localStorage
    const storedHistories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_HISTORY) || '{}');
    storedHistories[client.id] = history;
    localStorage.setItem(STORAGE_KEYS.CLIENT_HISTORY, JSON.stringify(storedHistories));

    return history;
  }, [invoiceHistory]);

  // Generate suggestions based on context
  const generateSuggestions = useCallback(async () => {
    if (!selectedClient) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const newSuggestions: AutoFillSuggestion[] = [];

    try {
      // Build client history
      const history = buildClientHistory(selectedClient);
      setClientHistory(history);

      // Currency suggestion based on client history
      if (finalOptions.enableClientHistory && history && !currentFormData.currency) {
        newSuggestions.push({
          field: 'currency',
          value: history.mostCommonCurrency,
          confidence: 0.8,
          reason: `${history.mostCommonCurrency} is this client's preferred currency`,
        });
      }

      // Amount prediction based on selected order or client history
      if (finalOptions.enableAmountPrediction && !currentFormData.amount && selectedOrder) {
        newSuggestions.push({
          field: 'amount',
          value: selectedOrder.amount,
          confidence: 0.95,
          reason: 'Amount matches the selected order',
        });
      } else if (finalOptions.enableAmountPrediction && !currentFormData.amount && history) {
        const confidence = history.lastInvoiceAmount > 0 ? 0.7 : 0.5;
        const suggestedAmount = history.lastInvoiceAmount || history.averageAmount;
        
        if (suggestedAmount > 0) {
          newSuggestions.push({
            field: 'amount',
            value: suggestedAmount,
            confidence,
            reason: confidence > 0.6 ? 
              'Based on last invoice amount' : 
              'Based on average invoice amount',
          });
        }
      }

      // Due date suggestion based on client payment patterns
      if (finalOptions.enableDateSuggestions && !currentFormData.dueDate && history) {
        const today = new Date();
        const suggestedDueDate = new Date();
        suggestedDueDate.setDate(today.getDate() + Math.ceil(history.averagePaymentDays));
        
        newSuggestions.push({
          field: 'dueDate',
          value: suggestedDueDate.toISOString().split('T')[0],
          confidence: 0.75,
          reason: `Based on client's average payment time (${Math.ceil(history.averagePaymentDays)} days)`,
        });
      }

      // Service-based suggestions
      if (finalOptions.enableServiceSuggestions && selectedOrder && services.length > 0) {
        const matchingService = services.find(service => 
          service.name.toLowerCase().includes(selectedOrder.description.toLowerCase()) ||
          selectedOrder.description.toLowerCase().includes(service.name.toLowerCase())
        );

        if (matchingService && !currentFormData.amount) {
          newSuggestions.push({
            field: 'amount',
            value: matchingService.defaultRate || matchingService.hourlyRate,
            confidence: 0.8,
            reason: `Based on ${matchingService.name} service rate`,
          });
        }
      }

      // Last form data suggestions (for frequently used values)
      if (lastUsedData && !selectedClient) {
        if (lastUsedData.currency && !currentFormData.currency) {
          newSuggestions.push({
            field: 'currency',
            value: lastUsedData.currency,
            confidence: 0.6,
            reason: 'Your most recently used currency',
          });
        }
      }

      // Filter suggestions by minimum confidence
      const filteredSuggestions = newSuggestions.filter(
        suggestion => suggestion.confidence >= finalOptions.minConfidence
      );

      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error generating auto-fill suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedClient,
    selectedOrder,
    currentFormData,
    services,
    buildClientHistory,
    finalOptions,
    lastUsedData,
  ]);

  // Generate suggestions when dependencies change
  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const applySuggestion = useCallback((suggestion: AutoFillSuggestion) => {
    // This would be handled by the parent component
    // The hook provides the suggestion, the component applies it
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  }, []);

  const applyAllSuggestions = useCallback(() => {
    // Mark all suggestions as applied
    setSuggestions([]);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    applySuggestion,
    applyAllSuggestions,
    clearSuggestions,
    isLoading,
    clientHistory,
    lastUsedData,
  };
};