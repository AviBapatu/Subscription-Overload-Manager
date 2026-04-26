import React from 'react';
import dayjs from 'dayjs';
import { getCardTheme } from './constants';

/**
 * SubscriptionCard — renders a single subscription in the grid.
 *
 * Props:
 *   sub              — subscription document
 *   lastApprovedId   — _id of newly approved suggestion (shows success overlay)
 *   onEdit           — (sub) => void
 *   onStatusChange   — ({ id, status }) => void
 *   onIgnore         — (id) => void
 *   onPay            — (id) => void
 *   onDelete         — (id) => void
 *   onDismissApproved — () => void
 *   isMutating       — bool (disables approve/ignore during pending requests)
 */
const SubscriptionCard = ({
    sub,
    lastApprovedId,
    onEdit,
    onStatusChange,
    onIgnore,
    onPay,
    onDelete,
    onDismissApproved,
    isMutating,
}) => {
    const theme = getCardTheme(sub.category);
    const daysLeft = dayjs(sub.nextBillingDate).diff(dayjs(), 'day');
    const progress = Math.max(0, Math.min(100, (daysLeft / 30) * 100));
    const isSuggested = sub.status === 'SUGGESTED';
    const isNewlyApproved = lastApprovedId === sub._id;

    // Free trial
    const isTrial = !!sub.trialEndsAt;
    const trialDaysLeft = isTrial ? dayjs(sub.trialEndsAt).diff(dayjs(), 'day') : null;

    return (
        <div className={`group relative bg-surface-container-lowest rounded-2xl p-8 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden ${(!isSuggested && sub.status !== 'ACTIVE') ? 'opacity-70 grayscale-[50%]' : ''}`}>

            {/* Success overlay when a suggestion is just approved */}
            {isNewlyApproved && (
                <div className="absolute inset-0 z-30 bg-primary/95 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-300">
                    <span className="material-symbols-outlined text-white text-5xl mb-4">check_circle</span>
                    <h3 className="text-white font-black text-xl mb-2">Approved Successfully</h3>
                    <p className="text-white/80 text-sm mb-6">Subscription added to your active list.</p>
                    <div className="flex gap-3">
                        <button onClick={() => { onDismissApproved(); onEdit(sub); }}
                            className="bg-white text-primary px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-all">
                            Edit Details
                        </button>
                        <button onClick={onDismissApproved}
                            className="border border-white/30 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-white/10 transition-all">
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Background gradient blob for active subs */}
            {sub.status === 'ACTIVE' && (
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.grad} to-transparent rounded-bl-[100px] pointer-events-none`} />
            )}

            {/* Suggested badge */}
            {isSuggested && (
                <div className="absolute top-4 right-4 z-10">
                    {sub.source === 'llm' ? (
                        <div className="bg-amber-500/10 text-amber-600 border border-amber-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            AI Detected
                        </div>
                    ) : (
                        <div className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            Detected
                        </div>
                    )}
                </div>
            )}

            {/* Free Trial badge (only on non-suggested active subs) */}
            {!isSuggested && isTrial && (
                <div className="absolute top-4 right-4 z-10">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border ${
                        trialDaysLeft <= 3
                            ? 'bg-red-500/10 text-red-600 border-red-400/30'
                            : 'bg-amber-400/10 text-amber-600 border-amber-400/30'
                    }`}>
                        <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                        {trialDaysLeft <= 0 ? 'Trial ended' : `${trialDaysLeft}d trial`}
                    </div>
                </div>
            )}

            {/* Icon + kebab menu row */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`w-14 h-14 ${isSuggested ? 'bg-surface-container-high' : theme.bg} rounded-full flex items-center justify-center shadow-lg ${isSuggested ? '' : theme.ring}`}>
                    <span className={`material-symbols-outlined ${isSuggested ? 'text-on-surface-variant' : 'text-white'} text-[28px]`} style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isSuggested ? 'mail' : theme.icon}
                    </span>
                </div>
                {!isSuggested && (
                    <div className="group/menu relative">
                        <button className="material-symbols-outlined text-outline-variant hover:text-on-surface hover:bg-surface-container-low w-8 h-8 rounded-full transition-colors flex items-center justify-center">
                            more_vert
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-40 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/10 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 py-2">
                            <button onClick={() => onEdit(sub)} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                            </button>
                            {sub.status === 'ACTIVE' ? (
                                <button onClick={() => onStatusChange({ id: sub._id, status: 'PAUSED' })} className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-container-low flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">pause</span> Pause
                                </button>
                            ) : (
                                <button onClick={() => onStatusChange({ id: sub._id, status: 'ACTIVE' })} className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-container-low flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">play_arrow</span> Resume
                                </button>
                            )}
                            <hr className="my-2 border-outline-variant/10" />
                            <button onClick={() => onDelete(sub._id)} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Name + category/status */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-on-background tracking-tight">{sub.serviceName}</h3>
                <p className="text-on-surface-variant text-sm font-medium flex items-center gap-1.5 mt-1">
                    {isSuggested
                        ? (sub.source === 'llm' ? '🤖 Detected by AI' : '📧 Detected from Gmail')
                        : sub.category}
                    {sub.status === 'PAUSED'    && <span className="bg-surface-container px-2 py-0.5 rounded text-xs">PAUSED</span>}
                    {sub.status === 'CANCELLED' && <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded text-xs">CANCELLED</span>}
                </p>
            </div>

            {/* Cost + next bill date */}
            <div className="flex items-end justify-between mb-4">
                <div>
                    <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">{sub.billingCycle || 'MONTHLY'}</p>
                    <p className="text-3xl font-black text-on-background tracking-tighter">${sub.cost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">Next Bill</p>
                    <p className="text-on-surface font-semibold text-sm">{dayjs(sub.nextBillingDate).format('MMM DD, YYYY')}</p>
                </div>
            </div>

            {/* Trial countdown strip */}
            {isTrial && !isSuggested && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-xs font-bold ${
                    trialDaysLeft <= 3 ? 'bg-red-500/10 text-red-600' : 'bg-amber-400/10 text-amber-700'
                }`}>
                    <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
                    {trialDaysLeft <= 0
                        ? 'Trial has ended — charges start soon'
                        : `Free trial ends ${dayjs(sub.trialEndsAt).format('MMM D')} (${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left)`}
                </div>
            )}

            {/* Bottom actions */}
            {isSuggested ? (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onStatusChange({ id: sub._id, status: 'ACTIVE' })}
                        disabled={isMutating}
                        className="py-3 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dim transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 disabled:opacity-50">
                        <span className="material-symbols-outlined text-[18px]">check</span> Approve
                    </button>
                    <button
                        onClick={() => onIgnore(sub._id)}
                        disabled={isMutating}
                        className="py-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        {isMutating ? 'Ignoring...' : 'Ignore'}
                    </button>
                </div>
            ) : sub.status === 'ACTIVE' && (
                <div className="space-y-3">
                    <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                        <div className={`${theme.bg} h-full rounded-full transition-all`} style={{ width: `${Math.max(5, progress)}%` }} />
                    </div>
                    <button
                        onClick={() => onPay(sub._id)}
                        className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Mark Paid
                    </button>
                </div>
            )}
        </div>
    );
};

export default SubscriptionCard;
