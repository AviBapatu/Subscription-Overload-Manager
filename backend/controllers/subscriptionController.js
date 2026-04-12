const Subscription = require('../models/Subscription');
const User = require('../models/User');
const dayjs = require('dayjs');

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const calculateNextBilling = (currentDate, cycle) => {
    const next = dayjs(currentDate);
    if (cycle === 'MONTHLY') return next.add(1, 'month').toDate();
    if (cycle === 'YEARLY')  return next.add(1, 'year').toDate();
    if (cycle === 'WEEKLY')  return next.add(1, 'week').toDate();
    return next.toDate();
};

const toMonthly = (sub) => {
    if (sub.billingCycle === 'MONTHLY') return sub.cost;
    if (sub.billingCycle === 'YEARLY')  return sub.cost / 12;
    if (sub.billingCycle === 'WEEKLY')  return sub.cost * 4.33;
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

        res.json({
            monthlySpend: parseFloat(monthlySpend.toFixed(2)),
            activeCount: active.length,
            pausedCount: statusCounts['PAUSED'] || 0,
            cancelledCount: statusCounts['CANCELLED'] || 0,
            upcoming7DayCost: parseFloat(upcoming7Days.toFixed(2)),
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
            const key = sub.billingCycle;
            if (!groups[key]) groups[key] = { label: key, totalMonthly: 0, count: 0 };
            groups[key].totalMonthly += toMonthly(sub);
            groups[key].count += 1;
        });

        const totalMonthly = Object.values(groups).reduce((a, g) => a + g.totalMonthly, 0);

        const breakdown = Object.values(groups).map(g => ({
            name: g.label === 'MONTHLY' ? 'Monthly' : g.label === 'YEARLY' ? 'Annual' : 'Weekly',
            value: parseFloat(g.totalMonthly.toFixed(2)),
            count: g.count,
            percentage: totalMonthly > 0 ? parseFloat(((g.totalMonthly / totalMonthly) * 100).toFixed(1)) : 0
        }));

        res.json(breakdown);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        const { userId, serviceName, cost, billingCycle, nextBillingDate, category } = req.body;

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
            notifyViaWhatsApp: user.preferences?.notifyViaWhatsApp
        });

        await newSub.save();
        res.status(201).json(newSub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSubscription = async (req, res) => {
    try {
        const { serviceName, cost, billingCycle, nextBillingDate, category } = req.body;

        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        const user = await User.findById(sub.userId);
        const alertDays = user?.preferences?.alertDaysBefore || 3;

        if (serviceName)    sub.serviceName = serviceName;
        if (cost !== undefined) sub.cost = parseFloat(cost);
        if (billingCycle)   sub.billingCycle = billingCycle;
        if (category)       sub.category = category;
        if (nextBillingDate) {
            sub.nextBillingDate = nextBillingDate;
            sub.alertDate = dayjs(nextBillingDate).subtract(alertDays, 'day').startOf('day').toDate();
        }

        await sub.save();
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

        const newBillingDate = calculateNextBilling(sub.nextBillingDate, sub.billingCycle);
        sub.nextBillingDate = newBillingDate;
        sub.alertDate = dayjs(newBillingDate).subtract(alertDays, 'day').startOf('day').toDate();

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
