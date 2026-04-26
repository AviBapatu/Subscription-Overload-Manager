import React from 'react';
import dayjs from 'dayjs';

// ─── Palette ──────────────────────────────────────────────────────────────────
export const CHART_COLORS = ['#0058bb', '#883c93', '#3853b7', '#3b82f6', '#8b5cf6'];
export const TIMELINE_COLORS = ['primary', 'tertiary', 'secondary', 'error', 'on-background'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-surface-container-high rounded-xl ${className}`} />
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
export const StatCard = ({ icon, label, value, sub, color = 'primary', loading }) => (
    <div className="relative overflow-hidden p-7 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-lg transition-all group cursor-default">
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
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                    {sub}
                </div>
            )}
        </div>
    </div>
);

// ─── Chart Tooltips ───────────────────────────────────────────────────────────
export const AreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card px-4 py-3 rounded-xl shadow-lg border border-white/40">
            <p className="text-xs font-bold text-on-surface-variant mb-1">{label}</p>
            <p className="text-lg font-black text-primary">${payload[0].value?.toFixed(2)}</p>
        </div>
    );
};

export const PieTooltip = ({ active, payload }) => {
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
export const TimelineItem = ({ sub, index, isLast }) => {
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
