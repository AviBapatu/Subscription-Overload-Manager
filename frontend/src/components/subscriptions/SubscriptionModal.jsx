import React from 'react';
import { CATEGORIES } from './constants';

/**
 * SubscriptionModal — add / edit subscription form in a full-screen overlay.
 *
 * Props:
 *   isOpen        — bool
 *   editingSub    — subscription object if editing, null if adding
 *   formData      — { serviceName, cost, billingCycle, category, nextBillingDate, isTrial, trialEndsAt }
 *   onFormChange  — (updates) => void  (merges patch into formData)
 *   onSubmit      — (e) => void
 *   onClose       — () => void
 *   isPending     — bool (disable submit while saving)
 */
const SubscriptionModal = ({ isOpen, editingSub, formData, onFormChange, onSubmit, onClose, isPending }) => {
    if (!isOpen) return null;

    const field = (key) => ({
        value: formData[key],
        onChange: (e) => onFormChange({ [key]: e.target.value }),
    });

    const inputCls = "w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none text-on-surface";
    const labelCls = "text-[11px] font-bold uppercase tracking-wide text-on-surface-variant ml-1";

    return (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black tracking-tighter text-on-surface">
                        {editingSub ? 'Edit Subscription' : 'Add Subscription'}
                    </h2>
                    <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full text-[20px]">
                        close
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-3">
                    <div className="space-y-1">
                        <label className={labelCls}>Service Name</label>
                        <input required type="text" {...field('serviceName')} className={inputCls} placeholder="e.g. Netflix" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className={labelCls}>Cost ($)</label>
                            <input required type="number" step="0.01" min="0" {...field('cost')} className={inputCls} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Cycle</label>
                            <select {...field('billingCycle')} className={inputCls}>
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                                <option value="WEEKLY">Weekly</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className={labelCls}>Category</label>
                        <select {...field('category')} className={inputCls}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className={labelCls}>Next Billing Date</label>
                        <input required type="date" {...field('nextBillingDate')} className={`${inputCls} color-scheme-light`} />
                    </div>

                    {/* ── Free Trial Toggle ────────────────────────────────── */}
                    <div className={`rounded-2xl border transition-colors p-3.5 ${formData.isTrial ? 'border-amber-400/40 bg-amber-50/60' : 'border-outline-variant/15 bg-surface-container-low/40'}`}>
                        <button
                            type="button"
                            onClick={() => onFormChange({ isTrial: !formData.isTrial, trialEndsAt: '' })}
                            className="w-full flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${formData.isTrial ? 'bg-amber-400/20' : 'bg-surface-container-high'}`}>
                                    <span className={`material-symbols-outlined text-[18px] ${formData.isTrial ? 'text-amber-600' : 'text-on-surface-variant'}`}>
                                        hourglass_empty
                                    </span>
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-sm ${formData.isTrial ? 'text-amber-700' : 'text-on-surface'}`}>Free Trial</p>
                                </div>
                            </div>
                            {/* pill toggle */}
                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${formData.isTrial ? 'bg-amber-400' : 'bg-surface-container-highest'}`}>
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${formData.isTrial ? 'translate-x-5' : 'translate-x-1'}`} />
                            </div>
                        </button>

                        {/* Trial end date — visible only when toggled on */}
                        {formData.isTrial && (
                            <div className="mt-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-[11px] font-bold uppercase tracking-wide text-amber-700 ml-1">Trial Ends On</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.trialEndsAt}
                                    onChange={e => onFormChange({ trialEndsAt: e.target.value })}
                                    className="w-full bg-white border border-amber-300/50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-400 outline-none text-on-surface color-scheme-light text-sm"
                                />
                                <p className="text-[11px] text-amber-600 ml-1 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">info</span>
                                    Alert 3 days before expiry
                                </p>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isPending}
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                        {isPending ? 'Saving...' : 'Save Subscription'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubscriptionModal;
