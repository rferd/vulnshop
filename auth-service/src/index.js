const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'auth-service' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/', authRoutes); // Also expose without /api prefix

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔐 Auth Service running on port ${PORT}`);
    console.log(`⚠️  WARNING: This service is intentionally vulnerable!`);
});
