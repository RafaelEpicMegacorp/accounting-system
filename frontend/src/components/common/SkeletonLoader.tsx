import React from 'react';
import { Box, Skeleton, Card, CardContent, Table, TableBody, TableCell, TableRow, Grid } from '@mui/material';

interface SkeletonLoaderProps {
  type: 'table' | 'card' | 'form' | 'list';
  rows?: number;
  animate?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type,
  rows = 5,
  animate = true,
}) => {
  const skeletonProps = {
    animation: animate ? 'wave' as const : false,
    sx: {
      bgcolor: 'action.hover',
      borderRadius: 1,
    },
  };

  switch (type) {
    case 'table':
      return (
        <Table>
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={20} height={20} {...skeletonProps} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Skeleton variant="circular" width={32} height={32} sx={{ mr: 2 }} {...skeletonProps} />
                    <Box>
                      <Skeleton width={120} height={20} {...skeletonProps} />
                      <Skeleton width={80} height={14} sx={{ mt: 0.5 }} {...skeletonProps} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Skeleton width={100} height={20} {...skeletonProps} />
                  <Skeleton width={60} height={14} sx={{ mt: 0.5 }} {...skeletonProps} />
                </TableCell>
                <TableCell>
                  <Skeleton width={80} height={20} {...skeletonProps} />
                </TableCell>
                <TableCell>
                  <Skeleton width={70} height={20} {...skeletonProps} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={60} height={24} {...skeletonProps} />
                </TableCell>
                <TableCell>
                  <Skeleton width={80} height={20} {...skeletonProps} />
                </TableCell>
                <TableCell align="center">
                  <Skeleton variant="circular" width={24} height={24} {...skeletonProps} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'card':
      return (
        <Grid container spacing={3}>
          {Array.from({ length: rows * 3 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} {...skeletonProps} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="80%" height={24} {...skeletonProps} />
                      <Skeleton width="60%" height={16} sx={{ mt: 0.5 }} {...skeletonProps} />
                    </Box>
                    <Skeleton variant="circular" width={24} height={24} {...skeletonProps} />
                  </Box>

                  {/* Client Info */}
                  <Box sx={{ mb: 2 }}>
                    <Skeleton width="70%" height={20} {...skeletonProps} />
                    <Skeleton width="50%" height={16} sx={{ mt: 0.5 }} {...skeletonProps} />
                  </Box>

                  {/* Order Info */}
                  <Box sx={{ mb: 2 }}>
                    <Skeleton width="90%" height={16} {...skeletonProps} />
                    <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} {...skeletonProps} />
                  </Box>

                  {/* Amount and Status */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Skeleton width={80} height={24} {...skeletonProps} />
                    <Skeleton variant="rounded" width={60} height={24} {...skeletonProps} />
                  </Box>

                  {/* Due Date */}
                  <Box>
                    <Skeleton width="60%" height={16} {...skeletonProps} />
                    <Skeleton variant="rounded" width={80} height={20} sx={{ mt: 0.5 }} {...skeletonProps} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );

    case 'form':
      return (
        <Box>
          {Array.from({ length: rows }).map((_, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Skeleton width="30%" height={16} sx={{ mb: 1 }} {...skeletonProps} />
              <Skeleton width="100%" height={56} {...skeletonProps} />
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Skeleton width={100} height={36} {...skeletonProps} />
            <Skeleton width={80} height={36} {...skeletonProps} />
          </Box>
        </Box>
      );

    case 'list':
      return (
        <Box>
          {Array.from({ length: rows }).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
              <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} {...skeletonProps} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="80%" height={20} {...skeletonProps} />
                <Skeleton width="60%" height={16} sx={{ mt: 0.5 }} {...skeletonProps} />
              </Box>
              <Skeleton width={60} height={20} {...skeletonProps} />
            </Box>
          ))}
        </Box>
      );

    default:
      return null;
  }
};

export default SkeletonLoader;