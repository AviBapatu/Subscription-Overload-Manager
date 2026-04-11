const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create user (mock auth scenario)
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

// PUT update preferences
router.put('/:id/preferences', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { $set: { preferences: req.body } }, 
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
