const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');

const router = express.Router();

// VULNERABILITY: Weak JWT secret (hardcoded, short, guessable)
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// VULNERABILITY: Weak password hashing using MD5
function hashPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // VULNERABILITY: No input validation
        // VULNERABILITY: No password complexity requirements
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // VULNERABILITY: Passwords stored with weak hashing (MD5)
        const passwordHash = hashPassword(password);

        // VULNERABILITY: Mass assignment - user can set their own role
        const role = req.body.role || 'user';

        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, email, passwordHash, role]
        );

        const user = result.rows[0];

        // VULNERABILITY: JWT tokens with no expiration
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET
            // Missing expiresIn option
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        // VULNERABILITY: Verbose error messages
        if (error.code === '23505') {
            // VULNERABILITY: User enumeration via error messages
            if (error.constraint === 'users_username_key') {
                return res.status(400).json({ 
                    error: 'Username already exists',
                    detail: error.detail
                });
            }
            if (error.constraint === 'users_email_key') {
                return res.status(400).json({ 
                    error: 'Email already exists',
                    detail: error.detail
                });
            }
        }
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Registration failed',
            message: error.message
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Missing username or password' });
        }

        const passwordHash = hashPassword(password);

        // VULNERABILITY: SQL Injection via string concatenation
        // This allows attackers to bypass authentication
        const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${passwordHash}'`;
        
        console.log('Executing query:', query); // VULNERABILITY: Logging SQL queries

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            // VULNERABILITY: User enumeration - check if user exists first
            const userCheck = await pool.query(
                `SELECT * FROM users WHERE username = '${username}'`
            );
            
            if (userCheck.rows.length === 0) {
                return res.status(401).json({ 
                    error: 'User not found',
                    // VULNERABILITY: Different message for user not found vs wrong password
                    hint: 'This username does not exist'
                });
            } else {
                return res.status(401).json({ 
                    error: 'Invalid password',
                    // VULNERABILITY: Reveals that username exists
                    hint: 'The password is incorrect'
                });
            }
        }

        const user = result.rows[0];

        // VULNERABILITY: JWT tokens with no expiration
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed',
            message: error.message,
            // VULNERABILITY: Exposing stack trace
            stack: error.stack
        });
    }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // VULNERABILITY: Using weak JWT secret
        const decoded = jwt.verify(token, JWT_SECRET);

        res.json({
            valid: true,
            user: decoded
        });
    } catch (error) {
        res.status(401).json({
            valid: false,
            error: error.message
        });
    }
});

module.exports = router;
