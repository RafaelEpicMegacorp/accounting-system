// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { clientService, ClientWithCounts, ClientSearchParams } from '../../services/clientService';

interface ClientListProps {
  onClientSelect?: (client: ClientWithCounts) => void;
  onClientEdit?: (client: ClientWithCounts) => void;
  onClientDelete?: (client: ClientWithCounts) => void;
  refreshTrigger?: number;
}

const ClientList: React.FC<ClientListProps> = ({
  onClientSelect,
  onClientEdit,
  onClientDelete,
  refreshTrigger = 0,
}) => {
  const [clients, setClients] = useState<ClientWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithCounts | null>(null);

  // Load clients
  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');

      const params: ClientSearchParams = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
        search: searchQuery.trim(),
        sortBy,
        sortOrder,
      };

      const response = await clientService.getClients(params);
      setClients(response.clients);
      setTotalCount(response.pagination.totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load clients');
      setClients([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load clients on mount and when dependencies change
  useEffect(() => {
    loadClients();
  }, [page, rowsPerPage, searchQuery, sortBy, sortOrder, refreshTrigger]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0); // Reset to first page on search
      loadClients();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: ClientWithCounts) => {
    setMenuAnchor(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedClient(null);
  };

  const handleClientClick = (client: ClientWithCounts) => {
    if (onClientSelect) {
      onClientSelect(client);
    }
  };

  const handleEdit = () => {
    if (selectedClient && onClientEdit) {
      onClientEdit(selectedClient);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedClient && onClientDelete) {
      onClientDelete(selectedClient);
    }
    handleMenuClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading && clients.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {/* Search Bar */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search clients by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Client Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell align="center">Orders</TableCell>
                  <TableCell align="center">Invoices</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleClientClick(client)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {getInitials(client.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {client.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created {new Date(client.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">{client.email}</Typography>
                        </Box>
                        {client.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {client.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {client.company ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <BusinessIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">{client.company}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No company
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={client._count.orders}
                        size="small"
                        color={client._count.orders > 0 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={client._count.invoices}
                        size="small"
                        color={client._count.invoices > 0 ? 'secondary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="More actions">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, client);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />

          {/* No Results */}
          {!loading && clients.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                {searchQuery ? 'No clients found matching your search' : 'No clients yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Add your first client to get started'
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          Edit Client
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          Delete Client
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ClientList;