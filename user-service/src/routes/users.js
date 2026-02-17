const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const router = express.Router();

// MongoDB connection
const MONGO_URL = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`;
let db;

MongoClient.connect(MONGO_URL)
    .then(client => {
        db = client.db(process.env.MONGO_DB || 'vulnshop');
        console.log('✅ Connected to MongoDB');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });

// Get user profile
router.get('/profile/:userId', async (req, res) => {
    try {
        // VULNERABILITY: No authentication required for accessing profiles
        const { userId } = req.params;

        // VULNERABILITY: NoSQL Injection - directly using user input
        // Attacker can pass {"$ne": null} to get all users
        const query = JSON.parse(`{"_id": "${userId}"}`);
        
        const user = await db.collection('users').findOne(query);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // VULNERABILITY: Exposing sensitive information
        res.json(user);
    } catch (error) {
        // VULNERABILITY: NoSQL injection via query parameter
        // Try to parse as JSON if not a valid ObjectId
        try {
            const user = await db.collection('users').findOne(JSON.parse(req.params.userId));
            if (user) {
                return res.json(user);
            }
        } catch (e) {
            // Ignore parsing errors
        }

        res.status(500).json({ 
            error: 'Failed to fetch user',
            message: error.message,
            stack: error.stack
        });
    }
});

// Update user profile
router.put('/profile/:userId', async (req, res) => {
    try {
        // VULNERABILITY: No authentication check
        // VULNERABILITY: Broken Object-Level Authorization (BOLA)
        // Users can update other users' profiles
        const { userId } = req.params;
        const updates = req.body;

        // VULNERABILITY: Mass assignment - users can set any field including 'role'
        // No filtering of sensitive fields like 'role', 'isAdmin', etc.
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to update profile',
            message: error.message
        });
    }
});

// Create user profile (MongoDB document)
router.post('/profile', async (req, res) => {
    try {
        // VULNERABILITY: No authentication required
        const profileData = req.body;

        // VULNERABILITY: Mass assignment - accept all fields from request
        // Users can set 'role', 'isAdmin', 'permissions', etc.
        const result = await db.collection('users').insertOne({
            ...profileData,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.status(201).json({
            message: 'Profile created successfully',
            userId: result.insertedId,
            profile: { ...profileData, _id: result.insertedId }
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to create profile',
            message: error.message
        });
    }
});

// Search users
router.get('/search', async (req, res) => {
    try {
        // VULNERABILITY: No authentication required
        // VULNERABILITY: NoSQL injection in search
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // VULNERABILITY: Directly using user input in MongoDB query
        // Allows injection like: ?query={"$where": "this.password != null"}
        let searchQuery;
        try {
            searchQuery = JSON.parse(query);
        } catch (e) {
            // If not JSON, search by username
            searchQuery = { username: new RegExp(query, 'i') };
        }

        const users = await db.collection('users').find(searchQuery).toArray();

        // VULNERABILITY: Exposing all user data including sensitive fields
        res.json({ 
            count: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Search failed',
            message: error.message,
            stack: error.stack
        });
    }
});

// Delete user
router.delete('/profile/:userId', async (req, res) => {
    try {
        // VULNERABILITY: No authentication or authorization check
        // Anyone can delete any user
        const { userId } = req.params;

        const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to delete user',
            message: error.message
        });
    }
});

// List all users - VULNERABILITY: No authentication
router.get('/list', async (req, res) => {
    try {
        // VULNERABILITY: No authentication required
        // VULNERABILITY: No pagination, can return huge dataset
        const users = await db.collection('users').find({}).toArray();

        res.json({ 
            count: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to list users',
            message: error.message
        });
    }
});

module.exports = router;
