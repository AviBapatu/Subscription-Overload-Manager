import React from 'react';
import { CATEGORIES } from './constants';

/**
 * SubscriptionModal — add / edit subscription form in a full-screen overlay.
 *
 * Props:
 *   isOpen        — bool
 *   editingSub    — subscription object if editing, null if adding
 *   formData      — { serviceName, cost, billingCycle, category, nextBillingDate }
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

    const inputCls = "w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-on-surface";
    const labelCls = "text-xs font-bold uppercase tracking-wide text-on-surface-variant ml-1";

    return (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black tracking-tighter text-on-surface">
                        {editingSub ? 'Edit Subscription' : 'Add Subscription'}
                    </h2>
                    <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-2 rounded-full">
                        close
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className={labelCls}>Service Name</label>
                        <input required type="text" {...field('serviceName')} className={inputCls} placeholder="e.g. Netflix" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="space-y-1 pb-4">
                        <label className={labelCls}>Next Billing Date</label>
                        <input required type="date" {...field('nextBillingDate')} className={`${inputCls} color-scheme-light`} />
                    </div>

                    <button type="submit" disabled={isPending}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                        {isPending ? 'Saving...' : 'Save Subscription'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubscriptionModal;
