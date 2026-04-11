import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchStats, fetchUpcoming, fetchSpendingHistory, fetchCategoryBreakdown } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

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

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats', userId],
        queryFn: () => fetchStats(userId),
        enabled: !!userId
    });

    const { data: upcoming, isLoading: upcomingLoading } = useQuery({
        queryKey: ['upcoming', userId],
        queryFn: () => fetchUpcoming(userId, 5),
        enabled: !!userId
    });

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

    // ── Hero ring progress (budget ring = % of $500 budget used) ──────────────
    const BUDGET = 500;
    const ringPct = stats ? Math.min((stats.monthlySpend / BUDGET) * 100, 100) : 0;
    const RING_R1 = 140, RING_R2 = 110, RING_R3 = 80;
    const circ = (r) => 2 * Math.PI * r;

    // Outer ring = spend vs budget
    const ring1Offset = circ(RING_R1) * (1 - ringPct / 100);
    // Middle ring = active count vs 20 (arbitrary max)
    const activePct = stats ? Math.min((stats.activeCount / 20) * 100, 100) : 0;
    const ring2Offset = circ(RING_R2) * (1 - activePct / 100);
    // Inner ring = upcoming 7-day cost vs monthly spend
    const upcomingPct = stats ? Math.min((stats.upcoming7DayCost / (stats.monthlySpend || 1)) * 100, 100) : 0;
    const ring3Offset = circ(RING_R3) * (1 - upcomingPct / 100);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Hero ──────────────────────────────────────────────────────── */}
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
                    <div className="flex gap-4 flex-wrap">
                        <a href="/subscriptions"
                            className="bg-surface-container-highest px-8 py-4 rounded-full font-bold hover:bg-surface-container-high transition-all text-on-surface">
                            View All Subs
                        </a>
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

            {/* ── Overview Cards ─────────────────────────────────────────────── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
                <StatCard icon="payments" label="Monthly Spend" color="primary"
                    value={`$${stats?.monthlySpend?.toFixed(2) ?? '0'}`}
                    sub={<span className="text-on-surface-variant">across all active services</span>}
                    loading={statsLoading} />
                <StatCard icon="calendar_today" label="Due This Week" color="tertiary"
                    value={`$${stats?.upcoming7DayCost?.toFixed(2) ?? '0'}`}
                    sub={<span className="text-on-surface-variant">in the next 7 days</span>}
                    loading={statsLoading} />
                <StatCard icon="verified_user" label="Active Services" color="secondary"
                    value={stats?.activeCount ?? '0'}
                    sub={<span className="text-on-surface-variant">{stats?.pausedCount ?? 0} paused · {stats?.cancelledCount ?? 0} cancelled</span>}
                    loading={statsLoading} />
                <StatCard icon="priority_high" label="Most Expensive" color="error"
                    value={stats?.mostExpensive?.name ?? '—'}
                    sub={<span className="text-on-surface-variant">
                        {stats?.mostExpensive
                            ? `$${stats.mostExpensive.cost} · ${stats.mostExpensive.billingCycle.toLowerCase()}`
                            : 'No active subscriptions'}
                    </span>}
                    loading={statsLoading} />
            </section>

            {/* ── Analytics + Timeline ────────────────────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left column: AreaChart + PieChart */}
                <div className="lg:col-span-2 space-y-8">

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
                            <h2 className="text-xl font-bold tracking-tight mb-1">Spending Breakdown</h2>
                            <p className="text-on-surface-variant text-sm">By billing cycle type</p>
                        </div>
                        {categoryLoading ? (
                            <Skeleton className="h-52 w-full" />
                        ) : categoryBreakdown?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant">
                                <span className="material-symbols-outlined text-5xl mb-3 opacity-30">pie_chart</span>
                                <p className="font-medium">No active subscriptions yet</p>
                            </div>
                        ) : (
                            <div className="flex flex-col lg:flex-row items-center gap-6">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={categoryBreakdown} dataKey="value" nameKey="name"
                                            cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                            paddingAngle={3} strokeWidth={0}>
                                            {categoryBreakdown?.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                        <Legend
                                            formatter={(v) => <span className="text-xs font-bold text-on-surface-variant">{v}</span>}
                                            iconSize={8} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Breakdown list */}
                                <div className="w-full lg:max-w-xs space-y-3">
                                    {categoryBreakdown?.map((d, i) => (
                                        <div key={d.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                                            <div className="flex items-center gap-3">
                                                <span className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                <div>
                                                    <p className="font-bold text-sm text-on-surface">{d.name}</p>
                                                    <p className="text-xs text-on-surface-variant">{d.count} subscription{d.count !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm text-on-surface">${d.value}/mo</p>
                                                <p className="text-xs text-on-surface-variant">{d.percentage}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: Timeline */}
                <div className="p-8 rounded-xl bg-surface-container-low shadow-sm flex flex-col">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold tracking-tight mb-1">Upcoming Renewals</h2>
                        <p className="text-on-surface-variant text-sm">Don't get caught by surprise</p>
                    </div>

                    {upcomingLoading ? (
                        <div className="space-y-6 flex-grow">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : upcoming?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-grow text-on-surface-variant">
                            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">event_available</span>
                            <p className="font-medium text-sm">No upcoming renewals</p>
                        </div>
                    ) : (
                        <div className="relative flex-grow pl-8 space-y-8">
                            <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-surface-container-highest rounded-full" />
                            {upcoming?.map((sub, i) => (
                                <TimelineItem key={sub._id} sub={sub} index={i} isLast={i === upcoming.length - 1} />
                            ))}
                        </div>
                    )}

                    <a href="/subscriptions"
                        className="mt-10 w-full py-4 border-2 border-primary/20 rounded-full font-bold text-primary hover:bg-primary/5 transition-all text-center block">
                        View All Subscriptions
                    </a>
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
                                Review & Optimize
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
