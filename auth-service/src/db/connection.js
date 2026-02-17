const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'vulnshop',
    password: process.env.POSTGRES_PASSWORD || 'vulnerable123',
    database: process.env.POSTGRES_DB || 'vulnshop',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on PostgreSQL client', err);
    process.exit(-1);
});

module.exports = { pool };
