const { dayjs } = require('./dayjsSetup');
const NotificationLog = require('../../models/NotificationLog');

// ─── Compute monthly-equivalent spend for a subscription ─────────────────────
const toMonthly = (sub) => {
    if (sub.billingCycle === 'YEARLY')  return sub.cost / 12;
    if (sub.billingCycle === 'WEEKLY')  return sub.cost * 4.33;
    return sub.cost; // MONTHLY
};

// ─── Check if a notification was already sent for a specific date/cycle ───────
const alreadySentToday = async (userId, subscriptionId, type, sentForDate) => {
    return NotificationLog.findOne({
        userId,
        subscriptionId,
        type,
        sentForDate: dayjs(sentForDate).startOf('day').toDate(),
    });
};

// ─── Log a delivered notification ────────────────────────────────────────────
const logDelivery = (userId, subscriptionId, type, sentForDate) =>
    NotificationLog.create({
        userId,
        subscriptionId,
        type,
        sentForDate: dayjs(sentForDate || new Date()).startOf('day').toDate(),
        status: 'DELIVERED',
    });

// ─── Quiet hours / snooze guard ───────────────────────────────────────────────
// Returns true if the current time falls within the user's quiet window,
// or if a global snooze is active. Pass the full user document.
const isInQuietHours = (user) => {
    if (!user) return false; // No user document — don't block notifications

    // Global snooze
    if (user.preferences?.snoozeUntil && dayjs(user.preferences.snoozeUntil).isAfter(dayjs())) {
        return true;
    }

    if (!user.preferences?.quietHoursEnabled) return false;

    const start = user.preferences.quietHoursStart || '22:00';
    const end   = user.preferences.quietHoursEnd   || '08:00';
    const now   = dayjs().tz(user.timezone || 'UTC').format('HH:mm');

    // Handle overnight windows (e.g. 22:00 → 08:00)
    if (start > end) return now >= start || now < end;
    return now >= start && now < end;
};

module.exports = { toMonthly, alreadySentToday, logDelivery, isInQuietHours };
