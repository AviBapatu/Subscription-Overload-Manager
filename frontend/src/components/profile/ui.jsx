import React, { useState } from 'react';

// ─── Toggle switch ────────────────────────────────────────────────────────────
export const Toggle = ({ checked, onChange, disabled = false }) => (
    <button type="button" onClick={onChange} disabled={disabled}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-primary' : 'bg-surface-container-highest'} disabled:opacity-40`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

// ─── Pill chip (multi-select) ─────────────────────────────────────────────────
export const Chip = ({ label, selected, onClick }) => (
    <button type="button" onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${selected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`}>
        {label}
    </button>
);

// ─── Section card with icon header ────────────────────────────────────────────
export const SettingsCard = ({ id, icon, title, subtitle, children }) => (
    <div id={id} className="bg-surface-container-lowest rounded-2xl p-8 md:p-10 shadow-sm border border-outline-variant/10 scroll-mt-28">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-outline-variant/10">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[28px]">{icon}</span>
            </div>
            <div>
                <h2 className="text-xl font-bold tracking-tight text-on-surface">{title}</h2>
                {subtitle && <p className="text-on-surface-variant text-sm mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="space-y-8">{children}</div>
    </div>
);

// ─── Preference row (label + control) ────────────────────────────────────────
export const PrefRow = ({ title, subtitle, children }) => (
    <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col flex-1">
            <span className="font-bold text-on-surface">{title}</span>
            {subtitle && <span className="text-sm text-on-surface-variant mt-1">{subtitle}</span>}
        </div>
        <div className="shrink-0 flex items-center">{children}</div>
    </div>
);

// ─── Delete account confirmation modal ────────────────────────────────────────
export const DeleteModal = ({ onClose }) => {
    const [confirmed, setConfirmed] = useState('');
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-error text-3xl">delete_forever</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">Delete Account</h3>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                    This is permanent. All your subscriptions, history, and preferences will be erased. Type <strong className="text-on-surface">DELETE</strong> to confirm.
                </p>
                <input type="text" placeholder="Type DELETE" value={confirmed} onChange={e => setConfirmed(e.target.value)}
                    className="w-full px-4 py-3 border border-outline-variant/30 bg-surface-container-low rounded-xl text-on-surface font-mono outline-none focus:ring-2 focus:ring-error/40 mb-4" />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors">Cancel</button>
                    <button disabled={confirmed !== 'DELETE'} className="flex-1 py-3 rounded-xl bg-error text-white font-bold hover:bg-error-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Delete Forever</button>
                </div>
            </div>
        </div>
    );
};
