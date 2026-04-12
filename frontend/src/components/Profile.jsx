import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchUser, updateUserPreferences, updateUserProfile } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

/* ─── Reusable Toggle ─────────────────────────────────────── */
const Toggle = ({ checked, onChange, disabled = false }) => (
    <button type="button" onClick={onChange} disabled={disabled}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-primary' : 'bg-surface-container-highest'} disabled:opacity-40`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

/* ─── Chip ────────────────────────────────────────────────── */
const Chip = ({ label, selected, onClick }) => (
    <button type="button" onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${selected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'}`}>
        {label}
    </button>
);

/* ─── Section Card ────────────────────────────────────────── */
const SettingsCard = ({ id, icon, title, subtitle, children }) => (
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

/* ─── Pref Row ────────────────────────────────────────────── */
const PrefRow = ({ title, subtitle, children }) => (
    <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col flex-1">
            <span className="font-bold text-on-surface">{title}</span>
            {subtitle && <span className="text-sm text-on-surface-variant mt-1">{subtitle}</span>}
        </div>
        <div className="shrink-0 flex items-center">{children}</div>
    </div>
);

/* ─── Delete Modal ────────────────────────────────────────── */
const DeleteModal = ({ onClose }) => {
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

/* ═══════════════════════════════════════════════════════════ */
const Profile = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => fetchUser(userId),
        enabled: !!userId
    });

    /* ── All preferences in a single flat object matching the schema ── */
    const defaultPrefs = {
        notifyViaEmail: true,
        alertDaysBefore: 3,
        notifUpcomingRenewals: true,
        notifPriceIncreases: false,
        notifFailedPayments: true,
        notifFreeTrialEnding: true,
        notifYearlyOnly: false,
        multipleReminders: false,
        reminderD7: false,
        reminderD3: true,
        reminderD1: false,
        reminderBilling: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        weeklySummary: false,
        budgetMonthly: 0,
        budgetAlertAt80: false,
        budgetAlertOnNew: false,
        perSubOverrides: false,
        snoozeUntil: null,
    };

    const [prefs, setPrefs] = useState(defaultPrefs);
    const [saving, setSaving] = useState(false);
    const [savedKey, setSavedKey] = useState(null); // tracks which field just saved

    /* ── Phone ── */
    const [phoneNumber, setPhoneNumber] = useState('');
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneDraft, setPhoneDraft] = useState('');
    const [phoneSaved, setPhoneSaved] = useState(false);

    /* ── Budget draft (text input — save on blur) ── */
    const [budgetDraft, setBudgetDraft] = useState('');

    /* ── Test notification ── */
    const [testSent, setTestSent] = useState(false);

    /* ── Delete modal ── */
    const [showDelete, setShowDelete] = useState(false);

    /* ── Sync server → local ── */
    useEffect(() => {
        if (!user) return;
        if (user.preferences) {
            setPrefs(p => ({ ...defaultPrefs, ...user.preferences }));
            setBudgetDraft(user.preferences.budgetMonthly > 0 ? String(user.preferences.budgetMonthly) : '');
        }
        if (user.phoneNumber !== undefined) {
            setPhoneNumber(user.phoneNumber || '');
            setPhoneDraft(user.phoneNumber || '');
        }
    }, [user]);

    /* ── Mutations ── */
    const prefMut = useMutation({
        mutationFn: (newPrefs) => updateUserPreferences(userId, newPrefs),
        onSuccess: () => queryClient.invalidateQueries(['user', userId]),
    });

    const profileMut = useMutation({
        mutationFn: (data) => updateUserProfile(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['user', userId]);
            setEditingPhone(false);
            setPhoneSaved(true);
            setTimeout(() => setPhoneSaved(false), 2500);
        }
    });

    /* ── Generic toggle: update key, persist entire prefs object ── */
    const toggle = (key) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        setSavedKey(key);
        prefMut.mutate(updated, { onSettled: () => setTimeout(() => setSavedKey(null), 1500) });
    };

    /* ── Generic field setter ── */
    const setPref = (key, value) => {
        const updated = { ...prefs, [key]: value };
        setPrefs(updated);
        prefMut.mutate(updated);
    };

    /* ── Budget save on blur ── */
    const handleBudgetBlur = () => {
        const val = parseFloat(budgetDraft) || 0;
        const updated = { ...prefs, budgetMonthly: val };
        setPrefs(updated);
        prefMut.mutate(updated);
    };

    /* ── Snooze ── */
    const handleSnooze = (hours) => {
        const isActive = prefs.snoozeUntil && dayjs(prefs.snoozeUntil).isAfter(dayjs());
        const currentHours = isActive ? dayjs(prefs.snoozeUntil).diff(dayjs(), 'hour') : null;
        if (isActive && Math.abs(currentHours - hours) <= 1) {
            // Clear snooze
            setPref('snoozeUntil', null);
        } else {
            setPref('snoozeUntil', dayjs().add(hours, 'hour').toISOString());
        }
    };

    const activeSnooze = prefs.snoozeUntil && dayjs(prefs.snoozeUntil).isAfter(dayjs());
    const snoozeUntilLabel = activeSnooze ? dayjs(prefs.snoozeUntil).format('h:mm A, MMM D') : null;

    /* ── Phone save ── */
    const handlePhoneSave = () => {
        setPhoneNumber(phoneDraft);
        profileMut.mutate({ name: user?.name, phoneNumber: phoneDraft, timezone: user?.timezone });
    };

    /* ── Test email (UI only) ── */
    const handleTestEmail = () => {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
    };

    const navSections = [
        { id: 'channels',    icon: 'notifications_active', label: 'Channels' },
        { id: 'notif-types', icon: 'tune',                 label: 'Notify Me About' },
        { id: 'frequency',   icon: 'schedule',              label: 'Reminder Frequency' },
        { id: 'quiet-hours', icon: 'bedtime',               label: 'Quiet Hours' },
        { id: 'summary',     icon: 'summarize',             label: 'Weekly Summary' },
        { id: 'budget',      icon: 'savings',               label: 'Budget Alerts' },
        { id: 'snooze',      icon: 'snooze',                label: 'Snooze & Test' },
        { id: 'advanced',    icon: 'settings_suggest',      label: 'Advanced' },
    ];

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
    );

    return (
        <>
            {showDelete && <DeleteModal onClose={() => setShowDelete(false)} />}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-10">

                {/* ── Profile Header ── */}
                <section className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-surface-container-lowest">
                    <div className="h-40 w-full bg-gradient-to-r from-primary to-tertiary opacity-90 relative">
                        <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
                    </div>
                    <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-14 relative z-10">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white shadow-xl bg-surface-container-highest flex items-center justify-center text-5xl font-black text-on-surface-variant shrink-0">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 pb-1">
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">{user?.name || 'User'}</h1>
                            <p className="text-on-surface-variant font-medium mt-0.5 text-sm">{user?.email}</p>
                            <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mt-1.5">Member since {dayjs(user?.createdAt).format('MMMM YYYY')}</p>
                        </div>
                    </div>
                </section>

                {/* ── Settings Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Side Nav */}
                    <div className="hidden lg:flex lg:col-span-3 flex-col gap-1.5 sticky top-28 self-start">
                        {navSections.map(s => (
                            <a key={s.id} href={`#${s.id}`}
                                className="flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all rounded-xl font-medium text-sm group">
                                <span className="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">{s.icon}</span>
                                <span>{s.label}</span>
                            </a>
                        ))}
                        <div className="mt-6 p-5 bg-gradient-to-br from-secondary to-primary-dim rounded-2xl text-white flex flex-col gap-3 shadow-lg shadow-blue-500/10">
                            <p className="font-bold leading-tight">Upgrade to Premium</p>
                            <p className="text-xs text-white/80">Advanced analytics & family sharing.</p>
                            <button className="w-full py-2 bg-white text-primary font-bold rounded-xl text-sm hover:scale-[1.02] transition-transform">Learn More</button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-9 flex flex-col gap-8">

                        {/* 1. Notification Channels */}
                        <SettingsCard id="channels" icon="notifications_active" title="Alert Preferences" subtitle="Manage how and when we notify you">
                            <PrefRow title="Email Alerts" subtitle={`Billing alerts sent to ${user?.email}`}>
                                <Toggle checked={prefs.notifyViaEmail} onChange={() => toggle('notifyViaEmail')} />
                            </PrefRow>

                            {/* Phone */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col flex-1">
                                    <span className="font-bold text-on-surface">Mobile Number</span>
                                    <span className="text-sm text-on-surface-variant mt-1">Receive SMS alerts for upcoming renewals</span>
                                    {editingPhone ? (
                                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">call</span>
                                                <input type="tel"
                                                    className="pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none text-sm border-none w-64"
                                                    placeholder="+91 98765 43210"
                                                    value={phoneDraft}
                                                    onChange={e => setPhoneDraft(e.target.value)}
                                                    autoFocus />
                                            </div>
                                            <button onClick={handlePhoneSave} disabled={profileMut.isLoading}
                                                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dim transition-colors disabled:opacity-60">
                                                {profileMut.isLoading ? 'Saving…' : 'Save'}
                                            </button>
                                            <button onClick={() => { setEditingPhone(false); setPhoneDraft(phoneNumber); }}
                                                className="px-4 py-2.5 bg-surface-container text-on-surface-variant rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-2 flex items-center gap-3">
                                            <span className="text-sm font-semibold text-on-surface">
                                                {phoneNumber || <span className="text-outline italic font-normal">No number added</span>}
                                            </span>
                                            {phoneSaved && (
                                                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                                                    <span className="material-symbols-outlined text-[16px]">check_circle</span> Saved!
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!editingPhone && (
                                    <button onClick={() => { setEditingPhone(true); setPhoneDraft(phoneNumber); }}
                                        className="mt-1 flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">{phoneNumber ? 'edit' : 'add'}</span>
                                        {phoneNumber ? 'Edit' : 'Add Number'}
                                    </button>
                                )}
                            </div>
                        </SettingsCard>

                        {/* 2. Notification Types */}
                        <SettingsCard id="notif-types" icon="tune" title="Notify Me About" subtitle="Choose which events trigger a notification">
                            {[
                                { key: 'notifUpcomingRenewals', label: 'Upcoming Renewals',    desc: 'Alert before any subscription renews' },
                                { key: 'notifPriceIncreases',   label: 'Price Increases',       desc: 'Notify when a service changes its pricing' },
                                { key: 'notifFailedPayments',   label: 'Failed Payments',       desc: 'Immediate alert if a charge fails' },
                                { key: 'notifFreeTrialEnding',  label: 'Free Trial Ending',     desc: 'Warn before a trial converts to paid' },
                                { key: 'notifYearlyOnly',       label: 'Yearly Renewals Only',  desc: 'Only notify for annual subscriptions' },
                            ].map(({ key, label, desc }) => (
                                <PrefRow key={key} title={label} subtitle={desc}>
                                    <Toggle checked={!!prefs[key]} onChange={() => toggle(key)} />
                                </PrefRow>
                            ))}
                        </SettingsCard>

                        {/* 3. Reminder Frequency */}
                        <SettingsCard id="frequency" icon="schedule" title="Reminder Frequency" subtitle="Control how many reminders you receive per renewal">
                            <PrefRow title="Multiple Reminders" subtitle="Get notified at several checkpoints before each renewal">
                                <Toggle checked={!!prefs.multipleReminders} onChange={() => toggle('multipleReminders')} />
                            </PrefRow>

                            {prefs.multipleReminders ? (
                                <div>
                                    <p className="text-sm font-semibold text-on-surface-variant mb-4">Remind me:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { key: 'reminderD7',      label: '7 days before' },
                                            { key: 'reminderD3',      label: '3 days before' },
                                            { key: 'reminderD1',      label: '1 day before'  },
                                            { key: 'reminderBilling', label: 'On billing day' },
                                        ].map(({ key, label }) => (
                                            <Chip key={key} label={label} selected={!!prefs[key]} onClick={() => toggle(key)} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <span className="font-bold text-on-surface block mb-1">Alert Timing</span>
                                    <span className="text-sm text-on-surface-variant block mb-3">How many days before renewal?</span>
                                    <div className="relative max-w-xs">
                                        <select value={prefs.alertDaysBefore}
                                            onChange={e => setPref('alertDaysBefore', parseInt(e.target.value))}
                                            className="w-full appearance-none bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface font-semibold focus:ring-2 focus:ring-primary outline-none">
                                            <option value={1}>1 Day Before</option>
                                            <option value={3}>3 Days Before</option>
                                            <option value={7}>7 Days Before</option>
                                            <option value={14}>14 Days Before</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-3.5 pointer-events-none text-on-surface-variant">expand_more</span>
                                    </div>
                                </div>
                            )}
                        </SettingsCard>

                        {/* 4. Quiet Hours */}
                        <SettingsCard id="quiet-hours" icon="bedtime" title="Quiet Hours" subtitle="Pause all notifications during sleeping hours">
                            <PrefRow title="Enable Quiet Hours" subtitle="No alerts will be sent during the window below">
                                <Toggle checked={!!prefs.quietHoursEnabled} onChange={() => toggle('quietHoursEnabled')} />
                            </PrefRow>
                            {prefs.quietHoursEnabled && (
                                <div className="flex flex-wrap gap-6 pt-2">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-semibold text-on-surface-variant">Start time</span>
                                        <input type="time" value={prefs.quietHoursStart}
                                            onChange={e => setPref('quietHoursStart', e.target.value)}
                                            className="bg-surface-container-low px-4 py-3 rounded-xl font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary border-none" />
                                    </label>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-semibold text-on-surface-variant">End time</span>
                                        <input type="time" value={prefs.quietHoursEnd}
                                            onChange={e => setPref('quietHoursEnd', e.target.value)}
                                            className="bg-surface-container-low px-4 py-3 rounded-xl font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary border-none" />
                                    </label>
                                </div>
                            )}
                        </SettingsCard>

                        {/* 5. Weekly Summary */}
                        <SettingsCard id="summary" icon="summarize" title="Weekly Summary" subtitle="Stay on top of your spending without daily pings">
                            <PrefRow title="Send Weekly Subscription Summary" subtitle="Get a Sunday digest of upcoming charges and totals">
                                <Toggle checked={!!prefs.weeklySummary} onChange={() => toggle('weeklySummary')} />
                            </PrefRow>
                        </SettingsCard>

                        {/* 6. Budget Alerts */}
                        <SettingsCard id="budget" icon="savings" title="Budget Alerts" subtitle="Get warned before your spending crosses a threshold">
                            <div className="flex flex-col gap-2">
                                <span className="font-bold text-on-surface">Monthly Budget</span>
                                <span className="text-sm text-on-surface-variant">Set your total subscription spending cap</span>
                                <div className="relative max-w-xs mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                                    <input type="number" min="0" placeholder="0.00"
                                        value={budgetDraft}
                                        onChange={e => setBudgetDraft(e.target.value)}
                                        onBlur={handleBudgetBlur}
                                        className="w-full pl-8 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface font-semibold outline-none focus:ring-2 focus:ring-primary border-none" />
                                </div>
                            </div>
                            <PrefRow title="Alert at 80% Budget" subtitle="Notify me when subscriptions reach 80% of my monthly cap">
                                <Toggle checked={!!prefs.budgetAlertAt80} onChange={() => toggle('budgetAlertAt80')} disabled={!prefs.budgetMonthly} />
                            </PrefRow>
                            <PrefRow title="Alert on New Subscription" subtitle="Notify when a new subscription is added to my account">
                                <Toggle checked={!!prefs.budgetAlertOnNew} onChange={() => toggle('budgetAlertOnNew')} />
                            </PrefRow>
                        </SettingsCard>

                        {/* 7. Snooze & Test */}
                        <SettingsCard id="snooze" icon="snooze" title="Snooze & Test" subtitle="Temporarily pause alerts or verify your setup">
                            <div>
                                <span className="font-bold text-on-surface block mb-1">Snooze All Alerts</span>
                                <span className="text-sm text-on-surface-variant block mb-4">
                                    {activeSnooze ? `Snoozed until ${snoozeUntilLabel}` : 'Temporarily mute all notifications'}
                                </span>
                                <div className="flex flex-wrap gap-3">
                                    {[{ label: '1 Hour', value: 1 }, { label: '6 Hours', value: 6 }, { label: '1 Day', value: 24 }].map(({ label, value }) => {
                                        const isSelected = activeSnooze && Math.abs(dayjs(prefs.snoozeUntil).diff(dayjs(), 'hour') - value) <= 1;
                                        return <Chip key={value} label={label} selected={!!isSelected} onClick={() => handleSnooze(value)} />;
                                    })}
                                    {activeSnooze && (
                                        <button onClick={() => setPref('snoozeUntil', null)}
                                            className="px-4 py-2 rounded-full text-sm font-semibold text-error bg-error/10 hover:bg-error/20 transition-colors border border-error/20">
                                            Clear Snooze
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-outline-variant/10">
                                <PrefRow title="Test Notification" subtitle="Send a sample alert to verify your email is working">
                                    <button onClick={handleTestEmail}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${testSent ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                                        <span className="material-symbols-outlined text-[18px]">{testSent ? 'check_circle' : 'send'}</span>
                                        {testSent ? 'Email Sent!' : 'Send Test Email'}
                                    </button>
                                </PrefRow>
                            </div>
                        </SettingsCard>

                        {/* 8. Advanced */}
                        <SettingsCard id="advanced" icon="settings_suggest" title="Advanced" subtitle="Fine-grained controls for power users">
                            <PrefRow title="Per-Subscription Overrides" subtitle="Allow custom reminder settings for individual subscriptions like Netflix or Spotify">
                                <Toggle checked={!!prefs.perSubOverrides} onChange={() => toggle('perSubOverrides')} />
                            </PrefRow>
                            <div className="pt-6 border-t border-outline-variant/10">
                                <span className="text-sm font-semibold text-on-surface-variant block mb-1">Timezone</span>
                                <p className="text-sm text-on-surface-variant">Alerts dispatched at 12:00 AM in: <strong className="text-on-surface">{user?.timezone || 'UTC'}</strong></p>
                            </div>
                        </SettingsCard>

                        {/* ── Danger Zone ── */}
                        <div className="bg-error/5 border border-error/20 rounded-2xl p-8 md:p-10">
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-error/15">
                                <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-error text-[28px]">warning</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-error">Danger Zone</h2>
                                    <p className="text-on-surface-variant text-sm mt-0.5">These actions are permanent and cannot be undone</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <p className="font-bold text-on-surface">Delete Account</p>
                                    <p className="text-sm text-on-surface-variant mt-1">Permanently remove your account, all subscriptions, and data.</p>
                                </div>
                                <button onClick={() => setShowDelete(true)}
                                    className="shrink-0 flex items-center gap-2 px-6 py-3 bg-error text-white rounded-xl font-bold text-sm hover:bg-error-dim transition-colors shadow-sm shadow-error/20">
                                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                    Delete Account
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
