const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// VULNERABILITY: CORS misconfiguration - allows all origins
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*']
}));

// VULNERABILITY: No rate limiting configured
// This allows attackers to perform brute force attacks

// VULNERABILITY: Verbose logging exposing internal information
app.use(morgan('combined'));

// VULNERABILITY: No input validation or sanitization at gateway level
app.use(express.json({ limit: '50mb' })); // VULNERABILITY: No request size limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// VULNERABILITY: Missing security headers
// Should add helmet middleware for security headers

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'gateway' });
});

// VULNERABILITY: Verbose error handler exposing internal architecture
app.use((err, req, res, next) => {
    console.error('Gateway Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        // VULNERABILITY: Exposing stack trace in production
        stack: err.stack,
        // VULNERABILITY: Exposing internal service details
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        headers: req.headers
    });
});

// Service proxy configurations
const serviceProxies = [
    {
        path: '/auth',
        target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
        service: 'auth-service'
    },
    {
        path: '/users',
        target: process.env.USER_SERVICE_URL || 'http://user-service:3002',
        service: 'user-service'
    },
    {
        path: '/products',
        target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3003',
        service: 'product-service'
    },
    {
        path: '/orders',
        target: process.env.ORDER_SERVICE_URL || 'http://order-service:3004',
        service: 'order-service'
    },
    {
        path: '/payments',
        target: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
        service: 'payment-service'
    },
    {
        path: '/notifications',
        target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
        service: 'notification-service'
    }
];

// Register proxies
serviceProxies.forEach(({ path, target, service }) => {
    app.use(path, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: {
            [`^${path}`]: ''
        },
        onError: (err, req, res) => {
            // VULNERABILITY: Exposing internal service URLs and errors
            console.error(`Proxy error for ${service}:`, err);
            res.status(503).json({
                error: 'Service Unavailable',
                service: service,
                target: target,
                message: err.message,
                // VULNERABILITY: Exposing internal network details
                details: `Failed to reach ${service} at ${target}`
            });
        },
        onProxyReq: (proxyReq, req, res) => {
            // VULNERABILITY: No authentication check at gateway level
            // All requests are forwarded without validation
            console.log(`Proxying ${req.method} ${req.path} to ${service}`);
        }
    }));
});

// Catch-all route
app.use('*', (req, res) => {
    // VULNERABILITY: Exposing available routes and internal structure
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableServices: serviceProxies.map(s => ({
            path: s.path,
            service: s.service,
            target: s.target
        })),
        hint: 'Try one of the available service paths'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚪 VulnShop API Gateway running on port ${PORT}`);
    console.log(`⚠️  WARNING: This gateway is intentionally vulnerable!`);
    console.log(`📋 Registered services:`);
    serviceProxies.forEach(s => {
        console.log(`   ${s.path} -> ${s.target}`);
    });
});
