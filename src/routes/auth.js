const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Get current user from session
router.get('/current-user', (req, res) => {
    if (req.session.user) {
        res.json({
            id: req.session.user.id,
            nickname: req.session.user.nickname,
            is_online: req.session.user.is_online
        });
    } else {
        res.status(401).json({ error: 'No user logged in' });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

router.post('/register', async (req, res) => {
    try {
        console.log('Raw request body:', req.body);
        
        // Extract and validate each field individually
        const nickname = req.body.nickname;
        const age = req.body.age;
        const sex = req.body.sex;
        const ip = req.body.ip || '127.0.0.1';  // Default IP if not provided
        const location = req.body.location || 'Unknown';  // Default location if not provided

        console.log('Extracted fields:', { nickname, age, sex, ip, location });

        // Validate each field with specific error messages
        const errors = [];
        
        if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
            errors.push('Nickname is required and must be a non-empty string');
        }
        
        if (!age || isNaN(age) || age < 18) {
            errors.push('Age is required and must be a number 18 or greater');
        }
        
        if (!sex || !['male', 'female'].includes(sex.toLowerCase())) {
            errors.push('Sex is required and must be either "male" or "female"');
        }

        if (errors.length > 0) {
            console.log('Validation errors:', errors);
            return res.status(400).json({ 
                error: 'Validation failed',
                details: errors 
            });
        }

        // Create new user
        console.log('Creating user with validated data:', {
            nickname: nickname.trim(),
            age: parseInt(age),
            sex: sex.toLowerCase(),
            ip: ip.trim(),
            location: location.trim()
        });

        const user = await User.create({
            nickname: nickname.trim(),
            age: parseInt(age),
            sex: sex.toLowerCase(),
            ip: ip.trim(),
            location: location.trim()
        });

        if (!user) {
            console.error('User creation returned null');
            return res.status(500).json({ error: 'Failed to create user' });
        }

        console.log('User created successfully:', user);

        // Store user in session
        req.session.user = user;

        // Return user data with required fields
        res.status(201).json({
            id: user.id,
            nickname: user.nickname,
            is_online: user.is_online
        });
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

module.exports = router; 