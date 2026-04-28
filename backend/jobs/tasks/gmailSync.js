const User = require('../../models/User');
const { runBackgroundSync } = require('../../services/gmailSyncService');

/* ═══════════════════════════════════════════════════════════════════════════
 *  JOB 6 — Daily Gmail Auto-Sync (runs at 02:00 IST)
 *  Iterates all users with a stored Google refresh token and triggers the
 *  background Gmail sync for each one.
 * ═══════════════════════════════════════════════════════════════════════════ */
const runDailyGmailSync = async () => {
    console.log('[CRON] Starting daily background Gmail sync...');
    try {
        const usersWithSync = await User.find({ googleRefreshToken: { $exists: true, $ne: null } });
        console.log(`[CRON] Found ${usersWithSync.length} users configured for auto-sync.`);

        for (const user of usersWithSync) {
            await runBackgroundSync(user._id);
        }
        console.log('[CRON] Daily background Gmail sync completed.');
    } catch (err) {
        console.error('[CRON] Fatal error in auto Gmail sync:', err);
    }
};

module.exports = { runDailyGmailSync };
