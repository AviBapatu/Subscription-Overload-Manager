import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * BillingItem — a single row card showing a subscription's billing date, name and amount.
 * `color` controls the accent (error / tertiary / primary).
 * `onMarkPaid` is optional; if provided a check button is shown.
 */
const BillingItem = ({ item, color, onMarkPaid }) => (
    <div className={`flex items-center justify-between p-4 bg-white/50 rounded-xl border border-${color}/10 hover:shadow-md transition-all`}>
        <div className="flex items-center gap-4">
            <div className={`text-center w-12 py-1 bg-${color}/10 rounded-lg`}>
                <div className={`text-[10px] uppercase font-bold text-${color} opacity-70`}>
                    {dayjs(item.nextBillingDate).format('MMM')}
                </div>
                <div className={`text-lg font-black text-${color} leading-none`}>
                    {dayjs(item.nextBillingDate).format('DD')}
                </div>
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-on-surface text-sm line-clamp-1">{item.service}</span>
                {color === 'error' && (
                    <span className="text-[10px] font-bold text-error uppercase">{dayjs(item.nextBillingDate).fromNow()}</span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className={`font-black text-${color} text-sm`}>₹{item.amount.toLocaleString('en-IN')}</span>
            {onMarkPaid && (
                <button onClick={() => onMarkPaid(item.id)}
                    className={`w-8 h-8 rounded-full bg-${color}/10 flex items-center justify-center text-${color} hover:bg-${color} hover:text-white transition-all shadow-sm`}>
                    <span className="material-symbols-outlined text-sm">check</span>
                </button>
            )}
        </div>
    </div>
);

/**
 * PaymentTimeline — Overdue, Due Soon and Upcoming subscription panels.
 */
const PaymentTimeline = ({ overdue, dueSoon, upcoming, onMarkPaid, timelineRef }) => (
    <section ref={timelineRef} className="space-y-8">
        <div className="flex items-end justify-between border-b border-outline-variant pb-4">
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-1">Payment Timeline</h2>
                <p className="text-on-surface-variant text-sm font-medium">Smart financial classification</p>
            </div>
        </div>

        {/* 1. Overdue — Full Width */}
        <div className="p-8 rounded-2xl bg-error/5 border border-error/10">
            <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-error mb-6">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                Overdue Payments
            </h3>
            {overdue.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-on-surface-variant font-bold">No overdue payments</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {overdue.slice(0, 5).map((item, i) => (
                        <BillingItem key={i} item={item} color="error" onMarkPaid={onMarkPaid} />
                    ))}
                </div>
            )}
            {overdue.length > 5 && (
                <div className="mt-6 text-center">
                    <a href="/subscriptions" className="text-xs font-bold text-error uppercase tracking-widest hover:underline">View All Overdue</a>
                </div>
            )}
        </div>

        {/* 2 & 3. Due Soon + Upcoming — Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Due Soon */}
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
                            {dueSoon.slice(0, 5).map((item, i) => (
                                <BillingItem key={i} item={item} color="tertiary" onMarkPaid={onMarkPaid} />
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

            {/* Upcoming */}
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
                            {upcoming.slice(0, 5).map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-primary/10 hover:shadow-md transition-all">
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
);

export default PaymentTimeline;
