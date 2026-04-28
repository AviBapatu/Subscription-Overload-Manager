import React from 'react';
import dayjs from 'dayjs';
import { Skeleton } from './ui';

const RING_R1 = 140, RING_R2 = 110, RING_R3 = 80;
const circ = (r) => 2 * Math.PI * r;
const BUDGET = 500;

/**
 * HeroSection — headline text, CTA buttons, and the animated spending rings.
 */
const HeroSection = ({ stats, statsLoading, isSyncing, isAutoScanEnabled, onGmailLogin }) => {
    const ringPct = stats ? Math.min((stats.monthlySpend / BUDGET) * 100, 100) : 0;
    const ring1Offset = circ(RING_R1) * (1 - ringPct / 100);

    const activePct = stats ? Math.min((stats.activeCount / 20) * 100, 100) : 0;
    const ring2Offset = circ(RING_R2) * (1 - activePct / 100);

    const upcomingPct = stats ? Math.min((stats.upcoming7DayCost / (stats.monthlySpend || 1)) * 100, 100) : 0;
    const ring3Offset = circ(RING_R3) * (1 - upcomingPct / 100);

    return (
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text & CTAs */}
            <div className="space-y-6">
                <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tighter text-on-surface leading-tight">
                    Your digital lifestyle,<br />
                    <span className="text-primary">perfectly curated.</span>
                </h1>
                <p className="text-xl text-on-surface-variant leading-relaxed max-w-lg">
                    Manage <span className="font-bold text-on-surface">{stats?.activeCount ?? '…'} active subscriptions</span>.
                    {' '}Spending <span className="font-bold text-primary">₹{stats?.monthlySpend?.toFixed(2) ?? '…'}</span> this month.
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
                        onClick={() => { if (!isAutoScanEnabled) onGmailLogin(); }}
                        disabled={isSyncing || isAutoScanEnabled}
                        className={`px-8 py-4 rounded-full font-bold transition-all flex items-center gap-2 ${
                            isAutoScanEnabled
                                ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-default shadow-sm'
                                : 'bg-surface-container-highest hover:bg-surface-container-high text-on-surface'
                        }`}>
                        <span className="material-symbols-outlined">
                            {isSyncing ? 'sync' : isAutoScanEnabled ? 'check_circle' : 'auto_awesome'}
                        </span>
                        {isSyncing ? 'Scanning Gmail...' : isAutoScanEnabled ? 'Auto-Scan Active' : 'Enable Auto-Scan'}
                    </button>
                    <a href="/subscriptions"
                        className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                        + Add Subscription
                    </a>
                </div>
            </div>

            {/* Right: Animated Rings */}
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
                            <stop offset="0%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#fcd34d" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                    {statsLoading
                        ? <Skeleton className="w-20 h-10" />
                        : <span className="text-4xl font-black tracking-tighter">₹{stats?.monthlySpend?.toFixed(0)}</span>
                    }
                    <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mt-1">/ month</span>
                </div>
                <div className="absolute bottom-0 flex gap-6 text-xs font-bold text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Budget
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block" />Active
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Due Soon
                    </span>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
