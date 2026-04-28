import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchUser, updateUserPreferences, updateUserProfile, sendTestEmail } from '../lib/api';

import { useAuth } from '../lib/AuthContext';

import { DeleteModal } from './profile/ui';
import ProfileSideNav, { NAV_SECTIONS } from './profile/ProfileSideNav';
import SettingsPanels from './profile/SettingsPanels';

// ─── Default preferences (mirrors the User schema) ────────────────────────────
const DEFAULT_PREFS = {
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

// ─── Profile (orchestrator) ───────────────────────────────────────────────────
const Profile = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();

    // ── Remote data ──────────────────────────────────────────────────────────
    const { data: user, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => fetchUser(userId),
        enabled: !!userId,
    });

    // ── Local state ──────────────────────────────────────────────────────────
    const [prefs, setPrefs]               = useState(DEFAULT_PREFS);
    const [savedKey, setSavedKey]         = useState(null);
    const [activeSection, setActiveSection] = useState('channels');

    const [phoneNumber, setPhoneNumber]   = useState('');
    const [editingPhone, setEditingPhone] = useState(false);
    const [phoneDraft, setPhoneDraft]     = useState('');
    const [phoneSaved, setPhoneSaved]     = useState(false);

    const [budgetDraft, setBudgetDraft]   = useState('');
    const [testSent, setTestSent]         = useState(false);
    const [isSending, setIsSending]       = useState(false);
    const [showDelete, setShowDelete]     = useState(false);

    // ── Sync server → local when user data arrives ───────────────────────────
    useEffect(() => {
        if (!user) return;
        if (user.preferences) {
            setPrefs({ ...DEFAULT_PREFS, ...user.preferences });
            setBudgetDraft(user.preferences.budgetMonthly > 0 ? String(user.preferences.budgetMonthly) : '');
        }
        if (user.phoneNumber !== undefined) {
            setPhoneNumber(user.phoneNumber || '');
            setPhoneDraft(user.phoneNumber || '');
        }
    }, [user]);

    // ── Scroll spy ───────────────────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => {
            const sections = NAV_SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
            let current = 'channels';
            for (const section of sections) {
                if (section.getBoundingClientRect().top <= 200) current = section.id;
            }
            setActiveSection(current);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ── Mutations ─────────────────────────────────────────────────────────────
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
        },
    });

    // ── Handlers ─────────────────────────────────────────────────────────────
    const toggle = (key) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        setSavedKey(key);
        prefMut.mutate(updated, { onSettled: () => setTimeout(() => setSavedKey(null), 1500) });
    };

    const setPref = (key, value) => {
        const updated = { ...prefs, [key]: value };
        setPrefs(updated);
        prefMut.mutate(updated);
    };

    const handleBudgetBlur = () => {
        const val = parseFloat(budgetDraft) || 0;
        const updated = { ...prefs, budgetMonthly: val };
        setPrefs(updated);
        prefMut.mutate(updated);
    };

    const handleSnooze = (hours) => {
        const isActive = prefs.snoozeUntil && dayjs(prefs.snoozeUntil).isAfter(dayjs());
        const currentHours = isActive ? dayjs(prefs.snoozeUntil).diff(dayjs(), 'hour') : null;
        if (isActive && Math.abs(currentHours - hours) <= 1) {
            setPref('snoozeUntil', null);
        } else {
            setPref('snoozeUntil', dayjs().add(hours, 'hour').toISOString());
        }
    };

    const handlePhoneSave = () => {
        setPhoneNumber(phoneDraft);
        profileMut.mutate({ name: user?.name, phoneNumber: phoneDraft, timezone: user?.timezone });
    };

    const handleTestEmail = async () => {
        if (isSending || testSent) return;
        setIsSending(true);
        try {
            await sendTestEmail(user?._id);
            setTestSent(true);
            setTimeout(() => setTestSent(false), 3000);
        } catch (err) {
            console.error('Failed to send test email', err);
            alert('Failed to send test email');
        } finally {
            setIsSending(false);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const activeSnooze   = prefs.snoozeUntil && dayjs(prefs.snoozeUntil).isAfter(dayjs());
    const snoozeUntilLabel = activeSnooze ? dayjs(prefs.snoozeUntil).format('h:mm A, MMM D') : null;

    // ── Loading spinner ───────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
    );

    return (
        <>
            {showDelete && <DeleteModal onClose={() => setShowDelete(false)} />}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-10">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <ProfileSideNav activeSection={activeSection} />

                    <SettingsPanels
                        user={user}
                        prefs={prefs}
                        toggle={toggle}
                        setPref={setPref}
                        // Phone
                        phoneNumber={phoneNumber}
                        editingPhone={editingPhone}
                        phoneDraft={phoneDraft}
                        phoneSaved={phoneSaved}
                        setPhoneDraft={setPhoneDraft}
                        setEditingPhone={setEditingPhone}
                        handlePhoneSave={handlePhoneSave}
                        profileMut={profileMut}
                        // Budget
                        budgetDraft={budgetDraft}
                        setBudgetDraft={setBudgetDraft}
                        handleBudgetBlur={handleBudgetBlur}
                        // Snooze
                        handleSnooze={handleSnooze}
                        activeSnooze={activeSnooze}
                        snoozeUntilLabel={snoozeUntilLabel}
                        // Test email
                        testSent={testSent}
                        isSending={isSending}
                        handleTestEmail={handleTestEmail}
                        // Danger zone
                        onDeleteRequest={() => setShowDelete(true)}
                    />
                </div>

            </div>
        </>
    );
};

export default Profile;
