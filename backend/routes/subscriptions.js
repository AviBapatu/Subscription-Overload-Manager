const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

// Secure all subscription routes
router.use(auth);

// Prevent cross-user data access
router.param('userId', (req, res, next, userId) => {
    if (req.user.id !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to another user\'s profile' });
    }
    next();
});

// ─────────────────────────────────────────
// Subscription Routes
// ─────────────────────────────────────────

router.get('/insights', subscriptionController.getInsights);
router.get('/upcoming', subscriptionController.getUpcomingTimeline);
router.get('/:userId', subscriptionController.getSubscriptions);
router.get('/:userId/stats', subscriptionController.getSubscriptionStats);
router.get('/:userId/upcoming', subscriptionController.getUpcomingRenewals);
router.get('/:userId/spending-history', subscriptionController.getSpendingHistory);
router.get('/:userId/category-breakdown', subscriptionController.getCategoryBreakdown);

router.post('/', subscriptionController.createSubscription);

router.put('/:id', subscriptionController.updateSubscription);
router.put('/:id/status', subscriptionController.updateSubscriptionStatus);
router.patch('/:id/ignore', subscriptionController.ignoreSubscription);
router.put('/:id/pay', subscriptionController.recordPayment);

router.delete('/:id', subscriptionController.deleteSubscription);

// Gmail Sync
router.post('/sync-gmail', subscriptionController.syncFromGmail);

module.exports = router;
