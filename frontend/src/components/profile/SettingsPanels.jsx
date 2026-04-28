import React from 'react';
import dayjs from 'dayjs';
import { Toggle, Chip, SettingsCard, PrefRow } from './ui';

/**
 * SettingsPanels — all 8 settings cards + danger zone.
 * Receives all prefs/handlers as props so the parent (Profile) owns all state.
 */
const SettingsPanels = ({
    user,
    prefs,
    toggle,
    setPref,
    // Phone
    phoneNumber,
    editingPhone,
    phoneDraft,
    phoneSaved,
    setPhoneDraft,
    setEditingPhone,
    handlePhoneSave,
    profileMut,
    // Budget
    budgetDraft,
    setBudgetDraft,
    handleBudgetBlur,
    // Snooze
    handleSnooze,
    activeSnooze,
    snoozeUntilLabel,
    // Test email
    testSent,
    handleTestEmail,
    // Danger zone
    onDeleteRequest,
}) => (
    <div className="lg:col-span-9 flex flex-col gap-8">

        {/* 0. Profile Overview */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 md:p-10 shadow-sm border border-outline-variant/10 scroll-mt-28">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl bg-surface-container-highest flex items-center justify-center text-3xl font-black text-on-surface-variant shrink-0 overflow-hidden">
                    {user?.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                        user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-on-surface">{user?.name || 'User'}</h1>
                    <p className="text-sm font-medium text-on-surface-variant">{user?.email}</p>
                    <p className="text-xs font-semibold text-outline-variant mt-1 uppercase tracking-wider">
                        Member since {dayjs(user?.createdAt || Date.now()).format('MMMM YYYY')}
                    </p>
                </div>
            </div>
        </div>

        {/* 1. Notification Channels */}
        <SettingsCard id="channels" icon="notifications_active" title="Alert Preferences" subtitle="Manage how and when we notify you">
            <PrefRow title="Email Alerts" subtitle={`Billing alerts sent to ${user?.email}`}>
                <Toggle checked={prefs.notifyViaEmail} onChange={() => toggle('notifyViaEmail')} />
            </PrefRow>

            {/* Phone number input */}
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
                { key: 'notifUpcomingRenewals', label: 'Upcoming Renewals',   desc: 'Alert before any subscription renews' },
                { key: 'notifPriceIncreases',   label: 'Price Increases',      desc: 'Notify when a service changes its pricing' },
                { key: 'notifFailedPayments',   label: 'Failed Payments',      desc: 'Immediate alert if a charge fails' },
                { key: 'notifFreeTrialEnding',  label: 'Free Trial Ending',    desc: 'Warn before a trial converts to paid' },
                { key: 'notifYearlyOnly',       label: 'Yearly Renewals Only', desc: 'Only notify for annual subscriptions' },
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
            <div className="pt-4 mt-4 border-t border-outline-variant/10">
                <span className="text-sm text-on-surface-variant">All times are based on your timezone: <strong className="text-on-surface">{user?.timezone === 'Asia/Kolkata' ? 'IST' : (user?.timezone || 'IST')}</strong></span>
            </div>
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


        {/* Danger Zone */}
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
                <button onClick={onDeleteRequest}
                    className="shrink-0 flex items-center gap-2 px-6 py-3 bg-error text-white rounded-xl font-bold text-sm hover:bg-error-dim transition-colors shadow-sm shadow-error/20">
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                    Delete Account
                </button>
            </div>
        </div>

    </div>
);

export default SettingsPanels;
