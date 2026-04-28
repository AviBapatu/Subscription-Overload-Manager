/**
 * routes/testEmails.js
 *
 * Development-only route definitions.
 * All handler logic lives in controllers/testController.js.
 *
 * GET  /api/test/emails        — list all available email types
 * POST /api/test/emails/:type  — fire a specific email type
 * POST /api/test/cron/:job     — manually trigger a cron job
 */
const router = require('express').Router();
const testController = require('../controllers/testController');

// ─── Guard: dev/staging only ──────────────────────────────────────────────────
router.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Test routes are disabled in production.' });
    }
    next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/emails',          testController.listEmailTypes);
router.post('/emails/:type',   testController.sendTestEmail);
router.post('/cron/:job',      testController.triggerCronJob);

module.exports = router;

