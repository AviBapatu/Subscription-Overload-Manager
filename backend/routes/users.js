const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ─────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────
// POST /api/users
//   Create user (or return existing) by email — used for initial seeding
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.json(existing);

        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────
// POST /api/users/register
// ─────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, phoneNumber, timezone } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const existing = await User.findOne({ email: email.trim().toLowerCase() });
        if (existing) return res.status(400).json({ error: 'Email already exists. Please sign in.' });

        const user = new User({
            email: email.trim().toLowerCase(),
            password: password, // Plain text for mock implementation
            name: name || email.split('@')[0],
            phoneNumber: phoneNumber || '',
            timezone: timezone || 'UTC',
            preferences: {
                notifyViaEmail: true,
                notifyViaWhatsApp: false,
                alertDaysBefore: 3
            }
        });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────
// POST /api/users/login
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        let user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        if (user.password && user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        } else if (!user.password) {
            // Migration for existing accounts from previous step
            user.password = password;
            await user.save();
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────
// PUT /api/users/:id/preferences
// ─────────────────────────────────────────
router.put('/:id/preferences', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { preferences: req.body } },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────
// PUT /api/users/:id
//   Update general profile (name, phone, timezone)
// ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { name, phoneNumber, timezone } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { name, phoneNumber, timezone } },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
