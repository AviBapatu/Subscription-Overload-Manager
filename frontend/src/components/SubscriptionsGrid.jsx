import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubscriptions, addSubscription, paySubscription, deleteSubscription } from '../lib/api';
import dayjs from 'dayjs';

const SubscriptionsGrid = () => {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);

    const { data: subscriptions, isLoading } = useQuery({
      queryKey: ['subscriptions'],
      queryFn: fetchSubscriptions
    });

    const activeCount = subscriptions?.filter(s => s.status === 'ACTIVE').length || 0;
    const totalMonthlyCost = subscriptions?.reduce((acc, sub) => {
        if (sub.status !== 'ACTIVE') return acc;
        if (sub.billingCycle === 'MONTHLY') return acc + sub.cost;
        if (sub.billingCycle === 'YEARLY') return acc + (sub.cost / 12);
        if (sub.billingCycle === 'WEEKLY') return acc + (sub.cost * 4.33);
        return acc;
    }, 0) || 0;

    // Helper functions for dynamic styling based on category or index
    const getCardTheme = (index) => {
        const themes = [
            { bg: 'bg-error', text: 'text-error', grad: 'from-error/10', ring: 'shadow-error/30', icon: 'movie' },
            { bg: 'bg-secondary', text: 'text-secondary', grad: 'from-secondary/10', ring: 'shadow-secondary/30', icon: 'music_note' },
            { bg: 'bg-tertiary', text: 'text-tertiary', grad: 'from-tertiary/10', ring: 'shadow-tertiary/30', icon: 'architecture' },
            { bg: 'bg-on-background', text: 'text-on-background', grad: 'from-on-background/10', ring: 'shadow-on-background/30', icon: 'edit_note' },
            { bg: 'bg-primary', text: 'text-primary', grad: 'from-primary/10', ring: 'shadow-primary/30', icon: 'play_circle' },
            { bg: 'bg-on-secondary-fixed-variant', text: 'text-on-secondary-fixed-variant', grad: 'from-on-secondary-fixed-variant/10', ring: 'shadow-on-secondary-fixed-variant/30', icon: 'smart_toy' },
        ];
        return themes[index % themes.length];
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                <h1 className="text-5xl font-black tracking-tighter text-on-background mb-2">My Subscriptions</h1>
                <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
                    You currently have <span className="text-primary font-bold">{activeCount} active subscriptions</span> costing <span className="text-primary font-bold">${totalMonthlyCost.toFixed(2)}</span> per month.
                </p>
                </div>
                <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-full">
                <button className="px-6 py-2 rounded-full bg-surface-container-lowest text-on-surface font-semibold shadow-sm">Grid View</button>
                <button className="px-6 py-2 rounded-full text-on-surface-variant hover:text-on-surface transition-colors">List View</button>
                </div>
            </header>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {isLoading && <div className="p-10 font-bold">Loading...</div>}
                
                {subscriptions?.map((sub, idx) => {
                    const theme = getCardTheme(idx);
                    // Mock progress logic for aesthetic from original HTML
                    const progressW = ['w-3/4', 'w-1/2', 'w-1/5', 'w-1/4', 'w-5/6', 'w-2/3'][idx % 6];
                    
                    return (
                    <div key={sub._id} className="group relative bg-surface-container-lowest rounded-lg p-8 transition-all duration-400 hover:scale-105 hover:shadow-[0_30px_60px_rgba(0,88,187,0.12)] shadow-[0_20px_40px_rgba(0,88,187,0.06)] overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.grad} to-transparent rounded-bl-full pointer-events-none`}></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className={`w-14 h-14 ${theme.bg} rounded-2xl flex items-center justify-center shadow-lg ${theme.ring}`}>
                                <span className="material-symbols-outlined text-white text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>{theme.icon}</span>
                            </div>
                            <button className="material-symbols-outlined text-outline-variant hover:text-on-surface transition-colors">more_vert</button>
                        </div>
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-on-background tracking-tight">{sub.serviceName}</h3>
                            <p className="text-on-surface-variant font-medium">Standard Plan</p>
                        </div>
                        <div className="flex items-end justify-between mb-6">
                            <div>
                                <p className="text-label-sm text-outline-variant uppercase tracking-widest mb-1">{sub.billingCycle}</p>
                                <p className="text-3xl font-black text-on-background tracking-tighter">${sub.cost}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-label-sm text-outline-variant uppercase tracking-widest mb-1">Next Bill</p>
                                <p className="text-on-surface font-semibold">{dayjs(sub.nextBillingDate).format('MMM DD, YYYY')}</p>
                            </div>
                        </div>
                        <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                            <div className={`${theme.bg} h-full rounded-full ${progressW}`}></div>
                        </div>
                    </div>
                )})}

                {/* New Subscription CTA */}
                <div className="group relative border-2 border-dashed border-outline-variant/30 rounded-lg p-8 flex flex-col items-center justify-center transition-all duration-400 hover:border-primary/50 hover:bg-surface-container-low text-center cursor-pointer">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-4xl">add</span>
                    </div>
                    <h3 className="text-xl font-bold text-on-surface">Add New Service</h3>
                    <p className="text-on-surface-variant text-sm mt-2">Connect a bank account or enter manually</p>
                </div>
            </div>

            {/* Insights Summary Floating Card */}
            <div className="mt-20 my-10 glass-card p-10 rounded-xl border border-white/40 shadow-[0_20px_40px_rgba(0,88,187,0.06)] flex flex-col lg:flex-row items-center gap-12 overflow-hidden relative">
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-container/20 blur-3xl rounded-full"></div>
                <div className="relative z-10 flex-1">
                    <h2 className="text-3xl font-black tracking-tight text-on-background mb-4">Savings Insight</h2>
                    <p className="text-on-surface-variant leading-relaxed text-lg mb-6">
                        We found 3 subscriptions you haven't used in the last 30 days. Cancelling these could save you <span className="text-primary font-bold">$42.99 / month</span>.
                    </p>
                    <button className="bg-on-background text-surface-container-lowest px-8 py-3 rounded-full font-bold transition-all duration-400 hover:scale-105 active:scale-95">Review Unused Plans</button>
                </div>
                <div className="relative z-10 flex gap-8 items-end">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 bg-secondary rounded-t-lg transition-all duration-1000" style={{height: '120px'}}></div>
                        <span className="text-xs font-bold text-outline-variant">AUG</span>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 bg-primary rounded-t-lg transition-all duration-1000" style={{height: '160px'}}></div>
                        <span className="text-xs font-bold text-outline-variant">SEP</span>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 bg-tertiary rounded-t-lg transition-all duration-1000" style={{height: '140px'}}></div>
                        <span className="text-xs font-bold text-outline-variant">OCT</span>
                    </div>
                    <div className="ml-4 text-left">
                        <p className="text-label-md text-outline-variant font-bold uppercase tracking-widest">Total Trend</p>
                        <p className="text-4xl font-black text-on-background tracking-tighter">-12%</p>
                    </div>
                </div>
            </div>

            {/* Fixed Add FAB for Mobile */}
            <button className="md:hidden fixed bottom-24 right-8 w-16 h-16 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center z-50">
                <span className="material-symbols-outlined text-3xl">add</span>
            </button>
        </div>
    );
};

export default SubscriptionsGrid;
