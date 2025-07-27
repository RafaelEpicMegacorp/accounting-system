import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  styled,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Visibility as PreviewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Tune as CustomizeIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  InvoiceTemplate,
  DEFAULT_TEMPLATES,
  TemplateCustomization,
} from '../../types/invoiceTemplates';

interface InvoiceTemplateSelectorProps {
  selectedTemplate?: InvoiceTemplate;
  onTemplateSelect: (template: InvoiceTemplate) => void;
  onCustomizeTemplate?: (template: InvoiceTemplate, customization: TemplateCustomization) => void;
  size?: 'small' | 'medium' | 'large';
  showCustomization?: boolean;
  className?: string;
}

const TemplateCard = styled(motion(Card))<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    height: '100%',
    cursor: 'pointer',
    border: `2px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
    position: 'relative',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      borderColor: selected ? theme.palette.primary.main : theme.palette.primary.light,
      boxShadow: theme.shadows[8],
      transform: 'translateY(-2px)',
    },
    ...(selected && {
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}, ${theme.shadows[4]}`,
    }),
  })
);

const PreviewImage = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 160,
  backgroundColor: theme.palette.grey[100],
  backgroundImage: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.spacing(1),
  position: 'relative',
  overflow: 'hidden',
}));

const CategoryBadge = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  left: 8,
  zIndex: 2,
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(4px)',
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 2,
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(4px)',
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.paper, 1),
  },
}));

const SelectedIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 3,
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.background.paper,
  borderRadius: '50%',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const InvoiceTemplateSelector: React.FC<InvoiceTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onCustomizeTemplate,
  size = 'medium',
  showCustomization = true,
  className,
}) => {
  const theme = useTheme();
  const [templates] = useState<InvoiceTemplate[]>(DEFAULT_TEMPLATES);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['modern-blue']);

  const getCategoryColor = (category: InvoiceTemplate['category']) => {
    switch (category) {
      case 'modern':
        return 'primary';
      case 'classic':
        return 'secondary';
      case 'minimal':
        return 'default';
      case 'corporate':
        return 'info';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = (category: InvoiceTemplate['category']) => {
    switch (category) {
      case 'modern':
        return 'Modern';
      case 'classic':
        return 'Classic';
      case 'minimal':
        return 'Minimal';
      case 'corporate':
        return 'Corporate';
      default:
        return 'Other';
    }
  };

  const handleTemplateSelect = (template: InvoiceTemplate) => {
    onTemplateSelect(template);
  };

  const handlePreview = (template: InvoiceTemplate, event: React.MouseEvent) => {
    event.stopPropagation();
    setPreviewTemplate(template);
    setPreviewDialogOpen(true);
  };

  const handleToggleFavorite = (templateId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavorites(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleCustomize = (template: InvoiceTemplate, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onCustomizeTemplate) {
      // Open customization dialog (to be implemented)
      console.log('Customize template:', template.name);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.3,
      },
    }),
    hover: {
      y: -4,
      transition: { duration: 0.2 },
    },
  };

  const getCardHeight = () => {
    switch (size) {
      case 'small':
        return 200;
      case 'large':
        return 300;
      default:
        return 250;
    }
  };

  const getPreviewHeight = () => {
    switch (size) {
      case 'small':
        return 120;
      case 'large':
        return 200;
      default:
        return 160;
    }
  };

  return (
    <>
      <Box className={className}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Choose Invoice Template
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={() => console.log('Create custom template')}
          >
            Create Custom
          </Button>
        </Box>

        <Grid container spacing={2}>
          {templates.map((template, index) => {
            const isSelected = selectedTemplate?.id === template.id;
            const isFavorite = favorites.includes(template.id);

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
                <TemplateCard
                  selected={isSelected}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  custom={index}
                  onClick={() => handleTemplateSelect(template)}
                  sx={{ height: getCardHeight() }}
                >
                  <CardActionArea sx={{ height: '100%' }}>
                    <PreviewImage sx={{ height: getPreviewHeight() }}>
                      <CategoryBadge
                        label={getCategoryLabel(template.category)}
                        color={getCategoryColor(template.category)}
                        size="small"
                      />
                      
                      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                        <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                          <ActionButton
                            size="small"
                            onClick={(e) => handleToggleFavorite(template.id, e)}
                          >
                            {isFavorite ? (
                              <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            ) : (
                              <StarBorderIcon sx={{ fontSize: 16 }} />
                            )}
                          </ActionButton>
                        </Tooltip>
                        
                        <Tooltip title="Preview template">
                          <ActionButton
                            size="small"
                            onClick={(e) => handlePreview(template, e)}
                          >
                            <PreviewIcon sx={{ fontSize: 16 }} />
                          </ActionButton>
                        </Tooltip>
                        
                        {showCustomization && (
                          <Tooltip title="Customize template">
                            <ActionButton
                              size="small"
                              onClick={(e) => handleCustomize(template, e)}
                            >
                              <CustomizeIcon sx={{ fontSize: 16 }} />
                            </ActionButton>
                          </Tooltip>
                        )}
                      </Box>

                      {isSelected && (
                        <SelectedIndicator>
                          <CheckIcon sx={{ fontSize: 20 }} />
                        </SelectedIndicator>
                      )}

                      {/* Template preview content */}
                      <Box
                        sx={{
                          width: '90%',
                          height: '90%',
                          backgroundColor: template.config.colors.background,
                          border: `1px solid ${template.config.colors.border}`,
                          borderRadius: 1,
                          p: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          fontSize: '6px',
                        }}
                      >
                        {/* Mini header */}
                        <Box
                          sx={{
                            height: '20%',
                            backgroundColor: alpha(template.config.colors.primary, 0.1),
                            borderRadius: 0.5,
                            mb: 0.5,
                          }}
                        />
                        {/* Mini content lines */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                          <Box sx={{ height: 2, backgroundColor: template.config.colors.text, opacity: 0.7, width: '60%' }} />
                          <Box sx={{ height: 2, backgroundColor: template.config.colors.textLight, opacity: 0.5, width: '40%' }} />
                          <Box sx={{ height: 2, backgroundColor: template.config.colors.text, opacity: 0.7, width: '80%' }} />
                          <Box sx={{ height: 2, backgroundColor: template.config.colors.textLight, opacity: 0.5, width: '30%' }} />
                        </Box>
                        {/* Mini footer */}
                        <Box
                          sx={{
                            height: '15%',
                            backgroundColor: alpha(template.config.colors.primary, 0.2),
                            borderRadius: 0.5,
                          }}
                        />
                      </Box>
                    </PreviewImage>

                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {template.name}
                        </Typography>
                        {template.isDefault && (
                          <Chip label="Default" size="small" color="primary" variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                        {template.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </TemplateCard>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Template Preview: {previewTemplate?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {previewTemplate?.description}
          </Typography>
          {/* Full-size preview would go here */}
          <Box
            sx={{
              height: 400,
              backgroundColor: theme.palette.grey[50],
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Full template preview will be rendered here
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Close
          </Button>
          {previewTemplate && (
            <Button
              variant="contained"
              onClick={() => {
                handleTemplateSelect(previewTemplate);
                setPreviewDialogOpen(false);
              }}
            >
              Select Template
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InvoiceTemplateSelector;