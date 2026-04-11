const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const dayjs = require('dayjs');

// Calculate next billing date intelligently
const calculateNextBilling = (currentDate, cycle) => {
    const next = dayjs(currentDate);
    if (cycle === 'MONTHLY') return next.add(1, 'month').toDate();
    if (cycle === 'YEARLY') return next.add(1, 'year').toDate();
    if (cycle === 'WEEKLY') return next.add(1, 'week').toDate();
    return next.toDate();
};

// GET all subscriptions for a user
router.get('/:userId', async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.params.userId }).sort({ nextBillingDate: 1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new subscription
router.post('/', async (req, res) => {
  try {
    const { userId, serviceName, cost, billingCycle, nextBillingDate } = req.body;
    
    // Fetch user for denormalization
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Compute Alert Date
    const alertDays = user.preferences?.alertDaysBefore || 3;
    const alertDate = dayjs(nextBillingDate).subtract(alertDays, 'day').startOf('day').toDate();

    const newSub = new Subscription({
      userId,
      serviceName,
      cost,
      billingCycle,
      nextBillingDate,
      alertDate,
      userEmail: user.email,
      userPhone: user.phoneNumber,
      userTimezone: user.timezone,
      notifyViaEmail: user.preferences?.notifyViaEmail,
      notifyViaWhatsApp: user.preferences?.notifyViaWhatsApp
    });

    await newSub.save();
    res.status(201).json(newSub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT Pay/Renew endpoint
router.put('/:id/pay', async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const user = await User.findById(sub.userId); // Fetch current preferences
    const alertDays = user ? (user.preferences?.alertDaysBefore || 3) : 3;

    const newBillingDate = calculateNextBilling(sub.nextBillingDate, sub.billingCycle);
    sub.nextBillingDate = newBillingDate;
    sub.alertDate = dayjs(newBillingDate).subtract(alertDays, 'day').startOf('day').toDate();

    // Refresh denormalized user data just in case it changed
    if (user) {
      sub.userEmail = user.email;
      sub.userPhone = user.phoneNumber;
      sub.userTimezone = user.timezone;
      sub.notifyViaEmail = user.preferences?.notifyViaEmail;
      sub.notifyViaWhatsApp = user.preferences?.notifyViaWhatsApp;
    }

    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Subscription
router.delete('/:id', async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndDelete(req.params.id);
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
