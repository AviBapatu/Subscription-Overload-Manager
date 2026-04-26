import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useGoogleLogin } from '@react-oauth/google';

import {
    fetchStats, fetchSpendingHistory, fetchCategoryBreakdown,
    setupAutoSync, fetchInsights, fetchUpcomingTimeline,
    paySubscription, fetchUser,
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';

import PrivacyBanner from './dashboard/PrivacyBanner';
import HeroSection from './dashboard/HeroSection';
import AnalyticsSection from './dashboard/AnalyticsSection';
import PaymentTimeline from './dashboard/PaymentTimeline';

dayjs.extend(relativeTime);

// ─── Dashboard (orchestrator) ─────────────────────────────────────────────────
const Dashboard = () => {
    const { userId, user, setUser } = useAuth();
    const queryClient = useQueryClient();
    const [isSyncing, setIsSyncing] = useState(false);
    const timelineRef = useRef(null);

    const scrollToTimeline = () =>
        timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // ── Gmail OAuth (auth-code flow) ──────────────────────────────────────────
    const gmailLogin = useGoogleLogin({
        flow: 'auth-code',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        onSuccess: async (codeResponse) => {
            setIsSyncing(true);
            try {
                const res = await setupAutoSync(userId, codeResponse.code);
                const count = Array.isArray(res.saved) ? res.saved.length : 0;
                alert(`Background Sync enabled! Found ${count} new subscriptions.`);
                const currentToken = localStorage.getItem('som_token');
                if (user && currentToken) {
                    setUser({ user: { ...user, hasAutoScanEnabled: true }, token: currentToken });
                }
                queryClient.invalidateQueries(['subscriptions']);
                queryClient.invalidateQueries(['stats']);
                queryClient.invalidateQueries(['insights']);
                queryClient.invalidateQueries(['upcomingTimeline']);
            } catch (err) {
                console.error('Auto sync setup failed:', err);
                alert('Could not configure auto-sync. Try again later.');
            } finally {
                setIsSyncing(false);
            }
        },
        onError: (err) => {
            console.error('Login Failed:', err);
            alert('Google authorization failed.');
        },
    });

    // ── Mark As Paid mutation ─────────────────────────────────────────────────
    const { mutate: handleMarkPaid } = useMutation({
        mutationFn: paySubscription,
        onSuccess: () => {
            queryClient.invalidateQueries(['stats']);
            queryClient.invalidateQueries(['insights']);
            queryClient.invalidateQueries(['upcomingTimeline']);
            alert('🎉 Payment recorded successfully!');
        },
        onError: (err) => {
            console.error('Failed to mark as paid:', err);
            alert('Could not update payment status.');
        },
    });

    // ── Data queries ──────────────────────────────────────────────────────────
    const { data: profile } = useQuery({
        queryKey: ['userProfile', userId],
        queryFn: () => fetchUser(userId),
        enabled: !!userId,
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats', userId],
        queryFn: () => fetchStats(userId),
        enabled: !!userId,
    });

    const { data: timelineData } = useQuery({
        queryKey: ['upcomingTimeline', userId],
        queryFn: fetchUpcomingTimeline,
        enabled: !!userId,
    });

    const { data: spendingHistory, isLoading: historyLoading } = useQuery({
        queryKey: ['spending-history', userId],
        queryFn: () => fetchSpendingHistory(userId),
        enabled: !!userId,
    });

    const { data: categoryBreakdown, isLoading: categoryLoading } = useQuery({
        queryKey: ['category-breakdown', userId],
        queryFn: () => fetchCategoryBreakdown(userId),
        enabled: !!userId,
    });

    // ── Derived state ─────────────────────────────────────────────────────────
    const isAutoScanEnabled = profile?.hasAutoScanEnabled || user?.hasAutoScanEnabled;
    const overdue  = timelineData?.overdue  || [];
    const dueSoon  = timelineData?.dueSoon  || [];
    const upcoming = timelineData?.upcoming || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <PrivacyBanner lastGmailSync={stats?.lastGmailSync} />

            <HeroSection
                stats={stats}
                statsLoading={statsLoading}
                isSyncing={isSyncing}
                isAutoScanEnabled={isAutoScanEnabled}
                onGmailLogin={gmailLogin}
            />

            {/* Overdue Alert Banner */}
            {overdue.length > 0 && (
                <div className="bg-error/5 border border-error/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse hover:animate-none transition-all">
                    <div className="flex items-center gap-5 text-center md:text-left">
                        <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error">
                            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-on-surface">Overdue Payments Detected</h2>
                            <p className="text-on-surface-variant font-medium">You have {overdue.length} subscriptions that need immediate attention.</p>
                        </div>
                    </div>
                    <button
                        onClick={scrollToTimeline}
                        className="bg-error text-white px-8 py-3.5 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-error/20 whitespace-nowrap">
                        Review & Resolve Now
                    </button>
                </div>
            )}

            <AnalyticsSection
                spendingHistory={spendingHistory}
                historyLoading={historyLoading}
                categoryBreakdown={categoryBreakdown}
                categoryLoading={categoryLoading}
            />

            <PaymentTimeline
                overdue={overdue}
                dueSoon={dueSoon}
                upcoming={upcoming}
                onMarkPaid={handleMarkPaid}
                timelineRef={timelineRef}
            />

        </div>
    );
};

export default Dashboard;
