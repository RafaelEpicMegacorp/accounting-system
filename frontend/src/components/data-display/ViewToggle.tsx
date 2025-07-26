import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';
import { ViewList, GridView } from '@mui/icons-material';
import { motion } from 'framer-motion';

export type ViewMode = 'table' | 'card';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  size?: 'small' | 'medium' | 'large';
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
  size = 'small'
}) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode | null,
  ) => {
    if (newViewMode !== null) {
      onViewModeChange(newViewMode);
    }
  };

  return (
    <Box>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleChange}
        aria-label="view mode"
        size={size}
        sx={{
          '& .MuiToggleButton-root': {
            border: '1px solid',
            borderColor: 'divider',
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
            '&:hover': {
              bgcolor: 'action.hover',
            },
            transition: 'all 0.2s ease-in-out',
          },
        }}
      >
        <ToggleButton 
          value="table" 
          aria-label="table view"
          component={motion.div}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ViewList />
        </ToggleButton>
        <ToggleButton 
          value="card" 
          aria-label="card view"
          component={motion.div}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <GridView />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default ViewToggle;