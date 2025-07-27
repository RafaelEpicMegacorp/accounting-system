import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  Select,
  Tooltip,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  FilterList,
  Download,
  Fullscreen,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { motion } from 'framer-motion';
import { RevenueData } from '../../hooks/useAnalytics';
import { formatCurrency } from '../../services/invoiceService';
import { keyboardNav } from '../../utils/accessibility';

export interface RevenueChartProps {
  data: RevenueData[];
  isLoading?: boolean;
  height?: number;
  showControls?: boolean;
  onExport?: (format: 'png' | 'svg' | 'csv') => void;
  onFullscreen?: () => void;
}

type ChartType = 'area' | 'bar' | 'line';
type TimeRange = 'all' | '6m' | '3m' | '1m';
type MetricView = 'all' | 'revenue' | 'paid' | 'pending' | 'overdue';

const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  isLoading = false,
  height = 400,
  showControls = true,
  onExport,
  onFullscreen,
}) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [metricView, setMetricView] = useState<MetricView>('all');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data;
    
    const monthsToShow = {
      '6m': 6,
      '3m': 3,
      '1m': 1,
    }[timeRange];
    
    return data.slice(-monthsToShow);
  }, [data, timeRange]);

  // Calculate trends and totals
  const analytics = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalPaid = filteredData.reduce((sum, item) => sum + item.paid, 0);
    const totalPending = filteredData.reduce((sum, item) => sum + item.pending, 0);
    const totalOverdue = filteredData.reduce((sum, item) => sum + item.overdue, 0);
    
    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(filteredData.length / 2);
    const firstHalf = filteredData.slice(0, midPoint);
    const secondHalf = filteredData.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.revenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.revenue, 0) / secondHalf.length;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    if (Math.abs(trendPercentage) > 5) {
      trend = trendPercentage > 0 ? 'up' : 'down';
    }
    
    return {
      totalRevenue,
      totalPaid,
      totalPending,
      totalOverdue,
      trend,
      trendPercentage: Math.abs(trendPercentage),
      averageMonthlyRevenue: totalRevenue / filteredData.length,
    };
  }, [filteredData]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 2, boxShadow: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2">
                {entry.name}: {formatCurrency(entry.value)}
              </Typography>
            </Box>
          ))}
        </Card>
      );
    }
    return null;
  };

  // Chart color scheme
  const colors = {
    revenue: '#1976d2',
    paid: '#2e7d32',
    pending: '#ed6c02',
    overdue: '#d32f2f',
  };

  // Export handlers
  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = (format: 'png' | 'svg' | 'csv') => {
    onExport?.(format);
    handleExportClose();
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.revenue} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.revenue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.paid} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.paid} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              tickFormatter={(value) => formatCurrency(value, true)}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            
            {(metricView === 'all' || metricView === 'revenue') && (
              <Area
                type="monotone"
                dataKey="revenue"
                name="Total Revenue"
                stroke={colors.revenue}
                fillOpacity={1}
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            )}
            {(metricView === 'all' || metricView === 'paid') && (
              <Area
                type="monotone"
                dataKey="paid"
                name="Paid"
                stroke={colors.paid}
                fillOpacity={1}
                fill="url(#paidGradient)"
                strokeWidth={2}
              />
            )}
            {(metricView === 'all' || metricView === 'pending') && (
              <Area
                type="monotone"
                dataKey="pending"
                name="Pending"
                stroke={colors.pending}
                fill={colors.pending}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
            {(metricView === 'all' || metricView === 'overdue') && (
              <Area
                type="monotone"
                dataKey="overdue"
                name="Overdue"
                stroke={colors.overdue}
                fill={colors.overdue}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#666" />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              tickFormatter={(value) => formatCurrency(value, true)}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            
            {(metricView === 'all' || metricView === 'paid') && (
              <Bar dataKey="paid" name="Paid" fill={colors.paid} radius={[2, 2, 0, 0]} />
            )}
            {(metricView === 'all' || metricView === 'pending') && (
              <Bar dataKey="pending" name="Pending" fill={colors.pending} radius={[2, 2, 0, 0]} />
            )}
            {(metricView === 'all' || metricView === 'overdue') && (
              <Bar dataKey="overdue" name="Overdue" fill={colors.overdue} radius={[2, 2, 0, 0]} />
            )}
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#666" />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              tickFormatter={(value) => formatCurrency(value, true)}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            
            {(metricView === 'all' || metricView === 'revenue') && (
              <Line
                type="monotone"
                dataKey="revenue"
                name="Total Revenue"
                stroke={colors.revenue}
                strokeWidth={3}
                dot={{ fill: colors.revenue, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors.revenue, strokeWidth: 2 }}
              />
            )}
            {(metricView === 'all' || metricView === 'paid') && (
              <Line
                type="monotone"
                dataKey="paid"
                name="Paid"
                stroke={colors.paid}
                strokeWidth={2}
                dot={{ fill: colors.paid, strokeWidth: 2, r: 3 }}
              />
            )}
            {(metricView === 'all' || metricView === 'pending') && (
              <Line
                type="monotone"
                dataKey="pending"
                name="Pending"
                stroke={colors.pending}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: colors.pending, strokeWidth: 2, r: 3 }}
              />
            )}
          </LineChart>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card sx={{ height: height + 100 }}>
        <CardHeader title={<Skeleton width="60%" />} />
        <CardContent>
          <Skeleton variant="rectangular" width="100%" height={height} />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" id="revenue-chart-title">Revenue Analytics</Typography>
              {analytics && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {analytics.trend === 'up' && <TrendingUp color="success" aria-label="Revenue trending up" />}
                  {analytics.trend === 'down' && <TrendingDown color="error" aria-label="Revenue trending down" />}
                  {analytics.trend === 'stable' && <TrendingFlat color="action" aria-label="Revenue stable" />}
                  <Chip
                    label={`${analytics.trendPercentage.toFixed(1)}%`}
                    size="small"
                    color={analytics.trend === 'up' ? 'success' : analytics.trend === 'down' ? 'error' : 'default'}
                    aria-label={`Trend change: ${analytics.trendPercentage.toFixed(1)} percent`}
                  />
                </Box>
              )}
            </Box>
          }
          action={
            showControls && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {onExport && (
                  <Tooltip title="Export chart">
                    <IconButton onClick={handleExportClick}>
                      <Download />
                    </IconButton>
                  </Tooltip>
                )}
                {onFullscreen && (
                  <Tooltip title="Fullscreen view">
                    <IconButton onClick={onFullscreen}>
                      <Fullscreen />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )
          }
        />
        
        {showControls && (
          <Box 
            sx={{ px: 3, pb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
            role="region"
            aria-labelledby="revenue-chart-title"
            aria-label="Chart controls"
          >
            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={(_, value) => value && setChartType(value)}
              size="small"
              aria-label="Chart type selection"
            >
              <ToggleButton value="area" aria-label="Area chart">Area</ToggleButton>
              <ToggleButton value="bar" aria-label="Bar chart">Bar</ToggleButton>
              <ToggleButton value="line" aria-label="Line chart">Line</ToggleButton>
            </ToggleButtonGroup>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                aria-label="Time range selection"
                inputProps={{ 'aria-label': 'Select time range' }}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="6m">6 Months</MenuItem>
                <MenuItem value="3m">3 Months</MenuItem>
                <MenuItem value="1m">1 Month</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={metricView}
                onChange={(e) => setMetricView(e.target.value as MetricView)}
                aria-label="Metric view selection"
                inputProps={{ 'aria-label': 'Select metrics to display' }}
              >
                <MenuItem value="all">All Metrics</MenuItem>
                <MenuItem value="revenue">Revenue</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        <CardContent>
          {analytics && (
            <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(analytics.totalRevenue)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Monthly Average
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(analytics.averageMonthlyRevenue)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Collection Rate
                </Typography>
                <Typography variant="h6" color="success.main">
                  {analytics.totalRevenue > 0 
                    ? `${((analytics.totalPaid / analytics.totalRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </Typography>
              </Box>
            </Box>
          )}
          
          <Box 
            sx={{ height, width: '100%' }}
            role="img"
            aria-labelledby="revenue-chart-title"
            aria-describedby="revenue-chart-summary"
          >
            <div id="revenue-chart-summary" className="sr-only">
              {analytics && (
                `Revenue chart showing ${filteredData.length} months of data. 
                 Total revenue: ${formatCurrency(analytics.totalRevenue)}. 
                 Monthly average: ${formatCurrency(analytics.averageMonthlyRevenue)}. 
                 Collection rate: ${analytics.totalRevenue > 0 
                   ? `${((analytics.totalPaid / analytics.totalRevenue) * 100).toFixed(1)}%`
                   : '0%'
                 }.`
              )}
            </div>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </Box>
        </CardContent>
        
        {/* Export Menu */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={handleExportClose}
        >
          <MenuItem onClick={() => handleExport('png')}>Export as PNG</MenuItem>
          <MenuItem onClick={() => handleExport('svg')}>Export as SVG</MenuItem>
          <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
        </Menu>
      </Card>
    </motion.div>
  );
};

export default RevenueChart;