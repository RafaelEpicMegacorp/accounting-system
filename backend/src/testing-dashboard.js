const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.TESTING_TOOL_PORT || '4000', 10);
const API_PORT = parseInt(process.env.PORT || '3001', 10);

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to get configuration
app.get('/api/config', (req, res) => {
    res.json({
        apiBaseUrl: `http://localhost:${API_PORT}`,
        testingToolPort: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check for testing tool
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'API Testing Dashboard',
        port: PORT,
        apiPort: API_PORT,
        timestamp: new Date().toISOString()
    });
});

// Serve the main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, 'localhost', () => {
    console.log(`🧪 API Testing Dashboard running on http://localhost:${PORT}`);
    console.log(`📡 Connecting to API server on http://localhost:${API_PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});

module.exports = app;