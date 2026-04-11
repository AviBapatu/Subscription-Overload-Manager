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
// POST /api/users/login
//   Mock authentication: find or create user by email
//   Body: { email, name?, phoneNumber?, timezone? }
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, name, phoneNumber, timezone } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        let user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            user = new User({
                email: email.trim().toLowerCase(),
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
