import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchStats, fetchUpcoming, fetchSpendingHistory, fetchCategoryBreakdown, setupAutoSync, syncFromGmail, fetchInsights, fetchUpcomingTimeline, paySubscription } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

dayjs.extend(relativeTime);

// ─── Palette for charts ────────────────────────────────────────────────────
const CHART_COLORS = ['#0058bb', '#883c93', '#3853b7', '#3b82f6', '#8b5cf6'];

// ─── Skeleton Loader ────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-surface-container-high rounded-xl ${className}`} />
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'primary', loading }) => (
    <div className={`relative overflow-hidden p-7 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all group cursor-default`}>
        <div className={`absolute -right-4 -top-4 w-28 h-28 bg-${color}/10 rounded-full blur-2xl group-hover:bg-${color}/20 transition-all`} />
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
                <span className={`material-symbols-outlined text-${color} mb-4 block text-[32px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                </span>
                <h3 className="text-on-surface-variant font-semibold mb-1 text-sm">{label}</h3>
                {loading ? <Skeleton className="h-8 w-24 mt-1" /> : (
                    <p className="text-3xl font-black tracking-tight">{value}</p>
                )}
            </div>
            {loading ? <Skeleton className="h-4 w-32 mt-4" /> : (
                <div className={`mt-4 flex items-center gap-2 text-sm font-medium text-on-surface-variant`}>
                    {sub}
                </div>
            )}
        </div>
    </div>
);

// ─── Custom Tooltip for AreaChart ─────────────────────────────────────────────
const AreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card px-4 py-3 rounded-xl shadow-lg border border-white/40">
            <p className="text-xs font-bold text-on-surface-variant mb-1">{label}</p>
            <p className="text-lg font-black text-primary">${payload[0].value?.toFixed(2)}</p>
        </div>
    );
};

// ─── Custom Tooltip for PieChart ──────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="glass-card px-4 py-3 rounded-xl shadow-lg border border-white/40">
            <p className="text-sm font-bold text-on-surface">{d.name}</p>
            <p className="text-xs text-on-surface-variant">{d.count} sub{d.count !== 1 ? 's' : ''}</p>
            <p className="text-primary font-black">${d.value}/mo · {d.percentage}%</p>
        </div>
    );
};

// ─── Timeline Item ────────────────────────────────────────────────────────────
const TIMELINE_COLORS = ['primary', 'tertiary', 'secondary', 'error', 'on-background'];
const TimelineItem = ({ sub, index, isLast }) => {
    const color = TIMELINE_COLORS[index % TIMELINE_COLORS.length];
    const daysLeft = dayjs(sub.nextBillingDate).diff(dayjs(), 'day');
    const label = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days left`;
    const dateStr = dayjs(sub.nextBillingDate).format('MMM DD');
    return (
        <div className={`relative ${isLast ? 'opacity-50' : ''}`}>
            <div className={`absolute -left-[33px] top-1.5 w-4 h-4 bg-${color} rounded-full ring-4 ring-white shadow-sm shadow-${color}/30`} />
            <div className="flex flex-col">
                <span className={`text-xs font-bold text-${color} uppercase tracking-widest mb-1`}>
                    {dateStr} • {label}
                </span>
                <h4 className="font-bold text-lg text-on-surface">{sub.serviceName}</h4>
                <p className="text-on-surface-variant text-sm">{sub.billingCycle.charAt(0) + sub.billingCycle.slice(1).toLowerCase()} plan · ${sub.cost.toFixed(2)}</p>
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const [isSyncing, setIsSyncing] = useState(false);
    const timelineRef = useRef(null);

    const scrollToTimeline = () => {
        timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const gmailLogin = useGoogleLogin({
        flow: 'auth-code',
        onSuccess: async (codeResponse) => {
            setIsSyncing(true);
            try {
                // Now we send the auth code to the backend instead of the access token
                const res = await setupAutoSync(userId, codeResponse.code);
                console.log('Auto Sync Setup Response:', res);
                const count = Array.isArray(res.saved) ? res.saved.length : 0;
                alert(`Background Sync enabled! Found ${count} new subscriptions.`);
                queryClient.invalidateQueries(['subscriptions']);
                queryClient.invalidateQueries(['stats']);
                queryClient.invalidateQueries(['insights']);
                queryClient.invalidateQueries(['upcomingTimeline']);
            } catch (err) {
                console.error('Auto sync setup failed:', err);
                alert('Could not configure auto-sync. Try again later.');
            } finally {
                setIsSyncing(false);
            }
        },
        onError: (err) => {
            console.error('Login Failed:', err);
            alert('Google authorization failed.');
        },
        scope: 'https://www.googleapis.com/auth/gmail.readonly'
    });

    const { mutate: markAsPaid } = useQueryClient(); // Placeholder for naming, using mutate below
    
    const { mutate: handleMarkPaid } = useMutation({
        mutationFn: paySubscription,
        onSuccess: () => {
            queryClient.invalidateQueries(['stats']);
            queryClient.invalidateQueries(['insights']);
            queryClient.invalidateQueries(['upcomingTimeline']);
            alert('🎉 Payment recorded successfully!');
        },
        onError: (err) => {
            console.error('Failed to mark as paid:', err);
            alert('Could not update payment status.');
        }
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats', userId],
        queryFn: () => fetchStats(userId),
        enabled: !!userId
    });

    const { data: insights, isLoading: insightsLoading } = useQuery({
        queryKey: ['insights', userId],
        queryFn: () => fetchInsights(userId),
        enabled: !!userId
    });

    const { data: timelineData, isLoading: timelineLoading } = useQuery({
        queryKey: ['upcomingTimeline', userId],
        queryFn: () => fetchUpcomingTimeline(),
        enabled: !!userId
    });

    const overdue = timelineData?.overdue || [];
    const dueSoon = timelineData?.dueSoon || [];
    const upcoming = timelineData?.upcoming || [];

    const { data: spendingHistory, isLoading: historyLoading } = useQuery({
        queryKey: ['spending-history', userId],
        queryFn: () => fetchSpendingHistory(userId),
        enabled: !!userId
    });

    const { data: categoryBreakdown, isLoading: categoryLoading } = useQuery({
        queryKey: ['category-breakdown', userId],
        queryFn: () => fetchCategoryBreakdown(userId),
        enabled: !!userId
    });

    // ── Hero ring progress ────────────────────────────────────────────────────
    const BUDGET = 500;
    const ringPct = stats ? Math.min((stats.monthlySpend / BUDGET) * 100, 100) : 0;
    const RING_R1 = 140, RING_R2 = 110, RING_R3 = 80;
    const circ = (r) => 2 * Math.PI * r;

    // Outer ring = spend vs budget
    const ring1Offset = circ(RING_R1) * (1 - ringPct / 100);
    // Middle ring = active count vs 20
    const activePct = stats ? Math.min((stats.activeCount / 20) * 100, 100) : 0;
    const ring2Offset = circ(RING_R2) * (1 - activePct / 100);
    // Inner ring = upcoming 7-day cost vs monthly spend
    const upcomingPct = stats ? Math.min((stats.upcoming7DayCost / (stats.monthlySpend || 1)) * 100, 100) : 0;
    const ring3Offset = circ(RING_R3) * (1 - upcomingPct / 100);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Privacy Banner ─────────────────────────────────────────── */}
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-5 py-4 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <div className="flex-1 min-w-0">
                    <span className="font-semibold text-on-surface">Privacy First —</span>{' '}
                    We only read billing-related emails (invoices, receipts, renewals) to detect subscriptions.
                    Your email content is never stored on our servers.{' '}
                    {stats?.lastGmailSync && (
                        <span className="opacity-70">Last scanned {dayjs(stats.lastGmailSync).fromNow()}.</span>
                    )}
                </div>
                <a href="/profile" className="shrink-0 text-xs font-bold text-primary uppercase tracking-widest hover:underline whitespace-nowrap">
                    Manage Access
                </a>
            </div>

            <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tighter text-on-surface leading-tight">
                        Your digital lifestyle,<br />
                        <span className="text-primary">perfectly curated.</span>
                    </h1>
                    <p className="text-xl text-on-surface-variant leading-relaxed max-w-lg">
                        Manage <span className="font-bold text-on-surface">{stats?.activeCount ?? '…'} active subscriptions</span>.
                        {' '}Spending <span className="font-bold text-primary">${stats?.monthlySpend?.toFixed(2) ?? '…'}</span> this month.
                    </p>
                    {stats?.lastGmailSync && (
                        <p className="text-sm font-bold text-outline-variant uppercase tracking-widest">
                            Last synced: {dayjs(stats.lastGmailSync).fromNow()}
                        </p>
                    )}
                    <div className="flex gap-4 flex-wrap">
                        <a href="/subscriptions"
                            className="bg-surface-container-highest px-8 py-4 rounded-full font-bold hover:bg-surface-container-high transition-all text-on-surface">
                            View All Subs
                        </a>
                        <button
                            onClick={() => gmailLogin()}
                            disabled={isSyncing}
                            className="bg-surface-container-highest px-8 py-4 rounded-full font-bold hover:bg-surface-container-high transition-all text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined">{isSyncing ? 'sync' : 'auto_awesome'}</span>
                            {isSyncing ? 'Scanning Gmail...' : 'Enable Auto-Scan'}
                        </button>
                        <a href="/subscriptions"
                            className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                            + Add Subscription
                        </a>
                    </div>
                </div>

                {/* Hero Rings */}
                <div className="relative flex justify-center items-center h-[380px]">
                    <div className="absolute w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
                    <svg className="w-80 h-80 transform -rotate-90" viewBox="0 0 320 320">
                        {/* Ring tracks */}
                        <circle cx="160" cy="160" fill="transparent" r={RING_R1} stroke="currentColor" strokeWidth="22" className="text-surface-container-high" />
                        <circle cx="160" cy="160" fill="transparent" r={RING_R2} stroke="currentColor" strokeWidth="22" className="text-surface-container-high" />
                        <circle cx="160" cy="160" fill="transparent" r={RING_R3} stroke="currentColor" strokeWidth="22" className="text-surface-container-high" />
                        {/* Ring fills */}
                        <circle cx="160" cy="160" fill="transparent" r={RING_R1}
                            stroke="url(#g-blue)" strokeDasharray={circ(RING_R1)}
                            strokeDashoffset={ring1Offset} strokeLinecap="round" strokeWidth="22"
                            style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                        <circle cx="160" cy="160" fill="transparent" r={RING_R2}
                            stroke="url(#g-purple)" strokeDasharray={circ(RING_R2)}
                            strokeDashoffset={ring2Offset} strokeLinecap="round" strokeWidth="22"
                            style={{ transition: 'stroke-dashoffset 1.2s ease 0.2s' }} />
                        <circle cx="160" cy="160" fill="transparent" r={RING_R3}
                            stroke="url(#g-teal)" strokeDasharray={circ(RING_R3)}
                            strokeDashoffset={ring3Offset} strokeLinecap="round" strokeWidth="22"
                            style={{ transition: 'stroke-dashoffset 1.2s ease 0.4s' }} />
                        <defs>
                            <linearGradient id="g-blue" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#0058bb" />
                                <stop offset="100%" stopColor="#6c9fff" />
                            </linearGradient>
                            <linearGradient id="g-purple" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#883c93" />
                                <stop offset="100%" stopColor="#f39cfb" />
                            </linearGradient>
                            <linearGradient id="g-teal" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#3853b7" />
                                <stop offset="100%" stopColor="#b4c1ff" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                        {statsLoading
                            ? <Skeleton className="w-20 h-10" />
                            : <span className="text-4xl font-black tracking-tighter">${stats?.monthlySpend?.toFixed(0)}</span>
                        }
                        <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mt-1">/ month</span>
                    </div>
                    {/* Ring Labels */}
                    <div className="absolute bottom-0 flex gap-6 text-xs font-bold text-on-surface-variant">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Budget
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block" />Active
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />Due Soon
                        </span>
                    </div>
                </div>
            </section>

            {/* ── Overdue Alert Banner ─────────────────────────────────────────── */}
            {overdue.length > 0 && (
                <div className="bg-error/5 border border-error/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse hover:animate-none transition-all">
                    <div className="flex items-center gap-5 text-center md:text-left">
                        <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error">
                            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-on-surface">Overdue Payments Detected</h2>
                            <p className="text-on-surface-variant font-medium">You have {overdue.length} subscriptions that need immediate attention.</p>
                        </div>
                    </div>
                    <button 
                        onClick={scrollToTimeline}
                        className="bg-error text-white px-8 py-3.5 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-error/20 whitespace-nowrap">
                        Review & Resolve Now
                    </button>
                </div>
            )}

            {/* ── Overview Cards ─────────────────────────────────────────────── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
                <StatCard icon="payments" label="Monthly Spend" color="primary"
                    value={insights ? `₹${insights.totalMonthly.toLocaleString('en-IN')}` : '₹0'}
                    sub={<span className="text-on-surface-variant">total monthly obligation</span>}
                    loading={insightsLoading} />
                <StatCard icon="warning" label="Overdue" color="error"
                    value={insights?.overdueCount ?? '0'}
                    sub={<span className="text-on-surface-variant">past due payments</span>}
                    loading={insightsLoading} />
                <StatCard icon="schedule" label="Due Soon" color="tertiary"
                    value={insights?.dueSoonCount ?? '0'}
                    sub={<span className="text-on-surface-variant">billing in next 3 days</span>}
                    loading={insightsLoading} />
                <StatCard icon="event_repeat" label="Upcoming" color="primary"
                    value={insights?.upcomingCount ?? '0'}
                    sub={<span className="text-on-surface-variant">billing thereafter</span>}
                    loading={insightsLoading} />
                <StatCard icon="verified_user" label="Active Services" color="secondary"
                    value={insights?.activeCount ?? '0'}
                    sub={<span className="text-on-surface-variant">currently managed</span>}
                    loading={insightsLoading} />
            </section>

            {/* ── Analytics Section ────────────────────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AreaChart: Spending History */}
                <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight mb-1">Spending Analytics</h2>
                            <p className="text-on-surface-variant text-sm">Monthly trend — last 6 months</p>
                        </div>
                    </div>
                    {historyLoading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={spendingHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0058bb" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#0058bb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#595c5e' }}
                                    tickFormatter={(v) => v.split(' ')[0]} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#595c5e' }} tickFormatter={v => `$${v}`}
                                    axisLine={false} tickLine={false} width={52} />
                                <Tooltip content={<AreaTooltip />} />
                                <Area type="monotone" dataKey="spend" stroke="#0058bb" strokeWidth={2.5}
                                    fill="url(#areaGrad)" dot={{ fill: '#0058bb', r: 4, strokeWidth: 0 }}
                                    activeDot={{ r: 6, fill: '#0058bb', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* PieChart: Category Breakdown */}
                <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold tracking-tight mb-1">Category Breakdown</h2>
                        <p className="text-on-surface-variant text-sm">Monthly allocation</p>
                    </div>
                    {categoryLoading ? (
                        <Skeleton className="h-52 w-full" />
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <ResponsiveContainer width={180} height={180}>
                                <PieChart>
                                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name"
                                        cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                                        paddingAngle={3} strokeWidth={0}>
                                        {categoryBreakdown?.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {categoryBreakdown?.slice(0, 4).map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="font-bold text-on-surface opacity-80">{d.name}</span>
                                        </div>
                                        <span className="font-black text-on-surface">${d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Payment Timeline Section ──────────────────────────────────── */}
            <section ref={timelineRef} className="space-y-8">
                <div className="flex items-end justify-between border-b border-outline-variant pb-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight mb-1">Payment Timeline</h2>
                        <p className="text-on-surface-variant text-sm font-medium">Smart financial classification</p>
                    </div>
                </div>

                {/* 1. OVERDUE (Full Width) */}
                <div className="p-8 rounded-2xl bg-error/5 border border-error/10">
                    <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-error mb-6">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        Overdue Payments
                    </h3>
                    {overdue.length === 0 ? (
                        <div className="text-center py-6">
                            <span className="material-symbols-outlined text-green-500 text-4xl mb-2">task_alt</span>
                            <p className="text-on-surface-variant font-bold">No overdue payments ✅</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {overdue.slice(0, 5).map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-error/20 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center w-12 py-1 bg-error/10 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-error opacity-70">
                                                {dayjs(item.nextBillingDate).format('MMM')}
                                            </div>
                                            <div className="text-lg font-black text-error leading-none">
                                                {dayjs(item.nextBillingDate).format('DD')}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-on-surface text-sm line-clamp-1">{item.service}</span>
                                            <span className="text-[10px] font-bold text-error uppercase">{dayjs(item.nextBillingDate).fromNow()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-error text-sm">₹{item.amount.toLocaleString('en-IN')}</span>
                                        <button onClick={() => handleMarkPaid(item.id)}
                                            className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error hover:bg-error hover:text-white transition-all shadow-sm">
                                            <span className="material-symbols-outlined text-sm">check</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {overdue.length > 5 && (
                        <div className="mt-6 text-center">
                            <a href="/subscriptions" className="text-xs font-bold text-error uppercase tracking-widest hover:underline">View All Overdue</a>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 2. DUE SOON (Column) */}
                    <div className="p-8 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/30">
                        <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-tertiary mb-6">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                            Due Soon
                        </h3>
                        <div className="space-y-4">
                            {dueSoon.length === 0 ? (
                                <p className="text-sm text-center py-10 text-on-surface-variant font-medium italic">Nothing due soon</p>
                            ) : (
                                <>
                                    {dueSoon.slice(0, 5).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-tertiary/10 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center w-12 py-1 bg-tertiary/10 rounded-lg">
                                                    <div className="text-[10px] uppercase font-bold text-tertiary opacity-70">
                                                        {dayjs(item.nextBillingDate).format('MMM')}
                                                    </div>
                                                    <div className="text-lg font-black text-tertiary leading-none">
                                                        {dayjs(item.nextBillingDate).format('DD')}
                                                    </div>
                                                </div>
                                                <span className="font-bold text-on-surface text-sm line-clamp-1">{item.service}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-tertiary text-sm">₹{item.amount.toLocaleString('en-IN')}</span>
                                                <button onClick={() => handleMarkPaid(item.id)}
                                                    className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary hover:bg-tertiary hover:text-white transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {dueSoon.length > 5 && (
                                        <div className="pt-2 text-center">
                                            <a href="/subscriptions" className="text-[10px] font-black text-tertiary uppercase tracking-widest hover:underline">View More</a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* 3. UPCOMING (Column) */}
                    <div className="p-8 rounded-2xl bg-surface-container-low shadow-sm border border-outline-variant/30">
                        <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-primary mb-6">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>event_repeat</span>
                            Upcoming
                        </h3>
                        <div className="space-y-4">
                            {upcoming.length === 0 ? (
                                <p className="text-sm text-center py-10 text-on-surface-variant font-medium italic">No upcoming payments</p>
                            ) : (
                                <>
                                    {upcoming.slice(0, 5).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-primary/10 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center w-12 py-1 bg-primary/5 rounded-lg">
                                                    <div className="text-[10px] uppercase font-bold text-primary opacity-70">
                                                        {dayjs(item.nextBillingDate).format('MMM')}
                                                    </div>
                                                    <div className="text-lg font-black text-primary leading-none">
                                                        {dayjs(item.nextBillingDate).format('DD')}
                                                    </div>
                                                </div>
                                                <span className="font-bold text-on-surface text-sm line-clamp-1">{item.service}</span>
                                            </div>
                                            <span className="font-black text-on-surface text-sm opacity-80">₹{item.amount.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                    {upcoming.length > 5 && (
                                        <div className="pt-2 text-center">
                                            <a href="/subscriptions" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All Upcoming</a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Smart Recommendation Banner ──────────────────────────────────── */}
            {stats && stats.activeCount > 0 && (
                <section className="mt-8 relative rounded-2xl overflow-hidden p-10 md:p-12 bg-on-background text-white shadow-2xl">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #6c9fff 0%, transparent 60%), radial-gradient(circle at 80% 20%, #f39cfb 0%, transparent 60%)" }} />
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-xs font-bold mb-4 uppercase tracking-widest">
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                AI Insight
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-3">
                                Optimize your ${stats.monthlySpend.toFixed(0)}/mo spend
                            </h2>
                            <p className="text-white/70 text-base leading-relaxed mb-6">
                                You have {stats.activeCount} active subscriptions. Our algorithms can help identify overlapping services and unused plans to reduce costs.
                            </p>
                            <a href="/subscriptions"
                                className="inline-block bg-white text-on-background px-8 py-3.5 rounded-full font-bold hover:scale-105 transition-all">
                                Review &amp; Optimize
                            </a>
                        </div>
                        <div className="flex justify-center">
                            <div className="glass-card p-6 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-3xl font-black">{stats.activeCount}</p>
                                    <p className="text-xs text-white/60 font-bold uppercase tracking-widest mt-1">Active</p>
                                </div>
                                <span className="material-symbols-outlined text-3xl text-white/30">arrow_forward</span>
                                <div className="text-center">
                                    <p className="text-3xl font-black text-green-400">${stats.monthlySpend.toFixed(0)}</p>
                                    <p className="text-xs text-white/60 font-bold uppercase tracking-widest mt-1">Per Month</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Dashboard;
