const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
dayjs.extend(isBetween);

const {
    sendNewSubscriptionAlert,
    sendPriceIncreaseAlert,
} = require('../services/emailService');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const calculateNextBilling = (currentDate, cycle) => {
    const next = dayjs(currentDate);
    if (cycle === 'MONTHLY') return next.add(1, 'month').toDate();
    if (cycle === 'YEARLY') return next.add(1, 'year').toDate();
    if (cycle === 'WEEKLY') return next.add(1, 'week').toDate();
    return next.toDate();
};

const safeDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d) ? null : d;
};

const toMonthly = (sub) => {
    if (sub.billingCycle === 'MONTHLY') return sub.cost;
    if (sub.billingCycle === 'YEARLY') return sub.cost / 12;
    if (sub.billingCycle === 'WEEKLY') return sub.cost * 4.33;
    return 0;
};

// ─────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────

exports.getSubscriptions = async (req, res) => {
    try {
        const { status } = req.query; // optional filter: ?status=ACTIVE
        const query = { userId: req.params.userId };
        if (status) query.status = status;
        const subs = await Subscription.find(query).sort({ nextBillingDate: 1 });
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSubscriptionStats = async (req, res) => {
    try {
        const subs = await Subscription.find({ userId: req.params.userId });
        const active = subs.filter(s => s.status === 'ACTIVE');

        const monthlySpend = active.reduce((acc, s) => acc + toMonthly(s), 0);

        const upcoming7Days = subs
            .filter(s => s.status === 'ACTIVE' &&
                dayjs(s.nextBillingDate).diff(dayjs(), 'day') <= 7 &&
                dayjs(s.nextBillingDate).diff(dayjs(), 'day') >= 0)
            .reduce((acc, s) => acc + s.cost, 0);

        const mostExpensive = active.sort((a, b) => toMonthly(b) - toMonthly(a))[0] || null;

        const statusCounts = subs.reduce((acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
        }, {});

        const user = await User.findById(req.params.userId);
        
        res.json({
            monthlySpend: parseFloat(monthlySpend.toFixed(2)),
            activeCount: active.length,
            pausedCount: statusCounts['PAUSED'] || 0,
            cancelledCount: statusCounts['CANCELLED'] || 0,
            upcoming7DayCost: parseFloat(upcoming7Days.toFixed(2)),
            lastGmailSync: user?.lastGmailSync || null,
            mostExpensive: mostExpensive ? {
                name: mostExpensive.serviceName,
                cost: mostExpensive.cost,
                billingCycle: mostExpensive.billingCycle
            } : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUpcomingRenewals = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const subs = await Subscription
            .find({ userId: req.params.userId, status: 'ACTIVE' })
            .sort({ nextBillingDate: 1 })
            .limit(limit);
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSpendingHistory = async (req, res) => {
    try {
        const subs = await Subscription.find({
            userId: req.params.userId,
            status: { $ne: 'CANCELLED' }
        });

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const m = dayjs().subtract(i, 'month');
            months.push({ month: m.format('MMM'), year: m.format('YYYY'), date: m });
        }

        const history = months.map(({ month, year, date }) => {
            const endOfMonth = date.endOf('month');
            const total = subs.reduce((acc, sub) => {
                if (sub.status === 'ACTIVE' && dayjs(sub.createdAt).isBefore(endOfMonth)) {
                    return acc + toMonthly(sub);
                }
                return acc;
            }, 0);

            return { month: `${month} ${year}`, spend: parseFloat(total.toFixed(2)) };
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCategoryBreakdown = async (req, res) => {
    try {
        const subs = await Subscription.find({ userId: req.params.userId, status: 'ACTIVE' });

        const groups = {};
        subs.forEach(sub => {
            const key = sub.category || 'Other';
            if (!groups[key]) groups[key] = { totalMonthly: 0, count: 0 };
            groups[key].totalMonthly += toMonthly(sub);
            groups[key].count += 1;
        });

        const totalMonthly = Object.values(groups).reduce((a, g) => a + g.totalMonthly, 0);

        const breakdown = Object.entries(groups)
            .map(([name, g]) => ({
                name,
                value: parseFloat(g.totalMonthly.toFixed(2)),
                count: g.count,
                percentage: totalMonthly > 0 ? parseFloat(((g.totalMonthly / totalMonthly) * 100).toFixed(1)) : 0
            }))
            .sort((a, b) => b.value - a.value);

        res.json(breakdown);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.createSubscription = async (req, res) => {
    try {
        const { userId, serviceName, cost, billingCycle, nextBillingDate, category, trialEndsAt } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const alertDays = user.preferences?.alertDaysBefore || 3;
        const alertDate = dayjs(nextBillingDate).subtract(alertDays, 'day').startOf('day').toDate();

        const newSub = new Subscription({
            userId,
            serviceName,
            cost: parseFloat(cost),
            billingCycle,
            nextBillingDate,
            alertDate,
            category: category || 'Other',
            userEmail: user.email,
            userPhone: user.phoneNumber,
            userTimezone: user.timezone,
            notifyViaEmail: user.preferences?.notifyViaEmail,
            notifyViaWhatsApp: user.preferences?.notifyViaWhatsApp,
            // Free trial fields
            trialEndsAt: trialEndsAt || null,
            trialAlertSent: false,
        });

        await newSub.save();

        // Fire "new subscription added" alert if the user opted in
        if (user.preferences?.budgetAlertOnNew && user.preferences?.notifyViaEmail) {
            sendNewSubscriptionAlert(user.email, user.name, newSub).catch(err =>
                console.error('[EMAIL] sendNewSubscriptionAlert failed:', err.message)
            );
        }

        res.status(201).json(newSub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSubscription = async (req, res) => {
    try {
        const { serviceName, cost, billingCycle, nextBillingDate, category, trialEndsAt } = req.body;

        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        const user = await User.findById(sub.userId);
        const alertDays = user?.preferences?.alertDaysBefore || 3;

        // Track old cost before overwriting
        const oldCost = sub.cost;

        if (serviceName) sub.serviceName = serviceName;
        if (cost !== undefined) sub.cost = parseFloat(cost);
        if (billingCycle) sub.billingCycle = billingCycle;
        if (category) sub.category = category;
        if (nextBillingDate) {
            sub.nextBillingDate = nextBillingDate;
            sub.alertDate = dayjs(nextBillingDate).subtract(alertDays, 'day').startOf('day').toDate();
        }
        // Update trial date — reset trialAlertSent so the alert can fire again
        if (trialEndsAt !== undefined) {
            sub.trialEndsAt = trialEndsAt || null;
            sub.trialAlertSent = false;
        }

        // If cost increased, store previousCost for audit
        if (cost !== undefined && parseFloat(cost) > oldCost) {
            sub.previousCost = oldCost;
        }

        await sub.save();

        // Fire price-increase alert if cost went up and user opted in
        if (
            cost !== undefined &&
            parseFloat(cost) > oldCost &&
            user?.preferences?.notifPriceIncreases &&
            user?.preferences?.notifyViaEmail
        ) {
            sendPriceIncreaseAlert(
                user.email, sub, oldCost, parseFloat(cost),
                nextBillingDate || sub.nextBillingDate
            ).catch(err => console.error('[EMAIL] sendPriceIncreaseAlert failed:', err.message));
        }

        res.json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSubscriptionStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }
        const sub = await Subscription.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        res.json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        const user = await User.findById(sub.userId);
        const alertDays = user ? (user.preferences?.alertDaysBefore || 3) : 3;

        // Transitions: Paid -> Next Cycle
        // If it was overdue (date < now), we move it forward until it hits the next upcoming date.
        // This ensures "NEVER keep a PAID item in OVERDUE".
        const now = dayjs();
        let nextDate = dayjs(sub.nextBillingDate);

        // Standard: Add 1 cycle
        if (sub.billingCycle === 'MONTHLY') nextDate = nextDate.add(1, 'month');
        else if (sub.billingCycle === 'YEARLY') nextDate = nextDate.add(1, 'year');
        else if (sub.billingCycle === 'WEEKLY') nextDate = nextDate.add(1, 'week');
        else nextDate = nextDate.add(1, 'month');

        // Enforcement: If STILL overdue, jump to the nearest future occurrence
        while (nextDate.isBefore(now, 'day')) {
            if (sub.billingCycle === 'MONTHLY') nextDate = nextDate.add(1, 'month');
            else if (sub.billingCycle === 'YEARLY') nextDate = nextDate.add(1, 'year');
            else if (sub.billingCycle === 'WEEKLY') nextDate = nextDate.add(1, 'week');
            else break;
        }

        const newDate = nextDate.toDate();
        sub.nextBillingDate = newDate;
        sub.alertDate = dayjs(newDate).subtract(alertDays, 'day').startOf('day').toDate();
        sub.overdueNotified = false; // RESET ⚠️
        sub.lastReminderSentAt = null; // RESET ⚠️
        sub.reminderCount = 0; // RESET ⚠️
        await sub.save();

        if (user) {
            sub.userEmail = user.email;
            sub.userPhone = user.phoneNumber;
            sub.syncedAt = new Date();
            await sub.save();
        }

        res.json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSubscription = async (req, res) => {
    try {
        const sub = await Subscription.findByIdAndDelete(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ message: 'Deleted successfully', sub });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Sync subscriptions from Gmail using an access token.
 */
exports.syncFromGmail = async (req, res) => {
    try {
        const { userId, accessToken } = req.body;
        if (!userId || !accessToken) {
            return res.status(400).json({ error: 'userId and accessToken are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const gmailSyncService = require('../services/gmailSyncService');
        const detected = await gmailSyncService.syncFromGmail(accessToken, userId);

        console.log("📥 Received from service:", detected.length);

        // Update last sync timestamp
        user.lastGmailSync = new Date();
        await user.save();

        const saved = [];
        for (const item of detected) {

            // 4. Email ID Dedup (STRONGER)
            if (item.emailId) {
                const existsByEmail = await Subscription.findOne({
                    emailId: item.emailId
                });

                if (existsByEmail) {
                    console.log("📧 Email already processed");
                    continue;
                }
            }

            // 1. Validate service
            const serviceName = item.serviceName || item.service;
            if (!serviceName || typeof serviceName !== "string") {
                console.warn("❌ Skipped: invalid service");
                continue;
            }

            // 1. Validate amount
            const amount = Number(item.cost || item.amount);
            if (isNaN(amount) || amount <= 0) {
                console.warn("❌ Skipped: invalid amount");
                continue;
            }

            // 1. Validate date
            const date = new Date(item.nextBillingDate);
            if (isNaN(date.getTime())) {
                console.warn("❌ Skipped: invalid date");
                continue;
            }

            // 2. Strong Duplicate Protection (Service Name check)
            const exists = await Subscription.findOne({
                userId,
                serviceName: { $regex: new RegExp(`^${serviceName.trim()}$`, 'i') },
                status: { $in: ['ACTIVE', 'SUGGESTED', 'PAUSED'] }
            });

            if (exists) {
                console.log("🔁 Duplicate skipped:", serviceName);
                continue;
            }

            // 3. Safe Save
            const sub = new Subscription({
                ...item,
                userId,
                serviceName: serviceName,
                cost: amount,
                nextBillingDate: date,
                status: "SUGGESTED",
                userEmail: user.email,
                userPhone: user.phoneNumber,
                userTimezone: user.timezone,
                notifyViaEmail: user.preferences?.notifyViaEmail,
                notifyViaWhatsApp: user.preferences?.notifyViaWhatsApp
            });

            await sub.save();
            saved.push(sub);

            console.log("✅ Saved:", sub.serviceName);
        }

        console.log("📊 Final saved:", saved.length);

        res.json(saved);
    } catch (err) {
        console.error('[SYNC ERROR]', err);
        res.status(500).json({ error: 'Gmail Sync failed', details: err.message });
    }
};

/**
 * Exchange auth code for refresh token, save it, and sync immediately.
 */
exports.setupAutoSync = async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) {
            return res.status(400).json({ error: 'userId and code are required' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const oAuth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID?.trim(),
            process.env.GOOGLE_CLIENT_SECRET?.trim(),
            'postmessage' // required for flow: 'auth-code' via frontend
        );

        const { tokens } = await oAuth2Client.getToken(code);
        
        if (tokens.refresh_token) {
            user.googleRefreshToken = tokens.refresh_token;
            await user.save();
        }

        // Run an immediate sync with the new access token
        const gmailSyncService = require('../services/gmailSyncService');
        const detected = await gmailSyncService.syncFromGmail(tokens.access_token, userId);

        user.lastGmailSync = new Date();
        await user.save();

        const saved = [];
        for (const item of detected) {
            if (item.emailId) {
                const existsByEmail = await Subscription.findOne({ emailId: item.emailId });
                if (existsByEmail) continue;
            }

            const serviceName = item.serviceName || item.service;
            if (!serviceName || typeof serviceName !== "string") continue;

            const amount = Number(item.cost || item.amount);
            if (isNaN(amount) || amount <= 0) continue;

            const date = new Date(item.nextBillingDate);
            if (isNaN(date.getTime())) continue;

            const exists = await Subscription.findOne({
                userId,
                serviceName: { $regex: new RegExp(`^${serviceName.trim()}$`, 'i') },
                status: { $in: ['ACTIVE', 'SUGGESTED', 'PAUSED'] }
            });

            if (exists) continue;

            const sub = new Subscription({
                ...item,
                userId,
                serviceName: serviceName,
                cost: amount,
                nextBillingDate: date,
                status: "SUGGESTED",
                userEmail: user.email,
                userPhone: user.phoneNumber,
                userTimezone: user.timezone,
                notifyViaEmail: user.preferences?.notifyViaEmail,
                notifyViaWhatsApp: user.preferences?.notifyViaWhatsApp
            });

            await sub.save();
            saved.push(sub);
        }

        res.json({ message: 'Auto-sync configured successfully', saved });
    } catch (err) {
        console.error('[AUTO SYNC SETUP ERROR]', err);
        res.status(500).json({ error: 'Failed to setup auto sync', details: err.message });
    }
};

exports.ignoreSubscription = async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        sub.status = 'IGNORED';
        await sub.save();

        res.json({ message: 'Subscription ignored successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getInsights = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        const userId = req.user.id;
        
        const subs = await Subscription.find({
            userId,
            status: { $regex: /^active$/i }
        });

        function parseAmount(val) {
            if (!val) return 0;
            try {
                return Number(String(val).replace(/[₹,\s]/g, ""));
            } catch {
                return 0;
            }
        }

        const totalMonthly = subs.reduce((sum, sub) => {
            return sum + parseAmount(sub.amount || sub.cost);
        }, 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const dueSoonLimit = new Date(now);
        dueSoonLimit.setDate(now.getDate() + 3);

        const overdue = [];
        const dueSoon = [];
        const upcoming = [];

        subs.forEach(s => {
            const d = safeDate(s.nextBillingDate);
            if (!d) return;

            // Normalize for comparison
            const compareDate = new Date(d);
            compareDate.setHours(0, 0, 0, 0);

            if (compareDate < now) overdue.push(s);
            else if (compareDate <= dueSoonLimit) dueSoon.push(s);
            else upcoming.push(s);
        });

        const mostExpensive = subs.reduce((max, sub) => {
            const current = parseAmount(sub.amount || sub.cost);
            const prev = parseAmount(max?.amount || max?.cost);
            return current > prev ? sub : max;
        }, subs[0] || null);

        res.json({
            totalMonthly: Number(totalMonthly.toFixed(2)),
            activeCount: subs.length,
            overdueCount: overdue.length,
            dueSoonCount: dueSoon.length,
            upcomingCount: upcoming.length,
            mostExpensive: mostExpensive?.serviceName || mostExpensive?.service || null
        });
    } catch (err) {
        console.error("[ERROR] Insights API failed:", err);
        res.status(500).json({ error: "Failed to generate insights", details: err.message });
    }
};

exports.getUpcomingTimeline = async (req, res) => {
    try {
        const userId = req.user.id;
        const subs = await Subscription.find({
            userId,
            status: { $regex: /^active$/i }
        });

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const dueSoonLimit = new Date(now);
        dueSoonLimit.setDate(now.getDate() + 3);

        const overdue = [];
        const dueSoon = [];
        const upcoming = [];

        function parseAmount(val) {
            if (!val) return 0;
            try { return Number(String(val).replace(/[₹,\s]/g, "")); } catch { return 0; }
        }

        subs.forEach(sub => {
            const d = safeDate(sub.nextBillingDate);
            if (!d) return;

            const compareDate = new Date(d);
            compareDate.setHours(0, 0, 0, 0);

            const item = {
                id: sub._id,
                service: sub.serviceName || sub.service,
                amount: parseAmount(sub.cost || sub.amount),
                nextBillingDate: d
            };

            if (compareDate < now) overdue.push(item);
            else if (compareDate <= dueSoonLimit) dueSoon.push(item);
            else upcoming.push(item);
        });

        // SORTING:
        // Overdue → most recently missed first
        overdue.sort((a, b) => new Date(b.nextBillingDate) - new Date(a.nextBillingDate));
        
        // Due Soon → nearest first
        dueSoon.sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));
        
        // Upcoming → nearest first
        upcoming.sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

        res.json({
            overdue: overdue.slice(0, 10),
            dueSoon: dueSoon.slice(0, 10),
            upcoming: upcoming.slice(0, 10)
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch timeline", details: err.message });
    }
};

/**
 * Trigger a manual sync for the currently logged in user
 */
exports.triggerManualSync = async (req, res) => {
    try {
        const userId = req.user.id;
        const gmailSyncService = require('../services/gmailSyncService');
        await gmailSyncService.runBackgroundSync(userId);
        res.json({ message: 'Manual sync complete' });
    } catch (err) {
        console.error('[MANUAL SYNC ERROR]', err);
        res.status(500).json({ error: 'Manual sync failed', details: err.message });
    }
};
