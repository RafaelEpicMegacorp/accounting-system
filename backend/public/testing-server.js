const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.TESTING_TOOL_PORT || 4000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'API Testing Dashboard',
    port: PORT,
    apiPort: 3000,
    timestamp: new Date().toISOString()
  });
});

// Default route serves the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🧪 API Testing Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/`);
});