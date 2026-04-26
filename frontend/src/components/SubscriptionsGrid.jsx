import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuth } from '../lib/AuthContext';
import {
    fetchSubscriptions, addSubscription, updateSubscription,
    updateSubscriptionStatus, paySubscription, deleteSubscription, ignoreSubscription,
} from '../lib/api';

import SubscriptionCard from './subscriptions/SubscriptionCard';
import SubscriptionModal from './subscriptions/SubscriptionModal';

// ─── Invalidate all subscription-related queries at once ─────────────────────
const SUB_QUERIES = ['subscriptions', 'insights', 'stats', 'upcomingTimeline'];
const invalidateAll = (qc) => SUB_QUERIES.forEach(k => qc.invalidateQueries([k]));

// ─── SubscriptionsGrid (orchestrator) ────────────────────────────────────────
const SubscriptionsGrid = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isModalOpen,  setIsModalOpen]  = useState(false);
    const [editingSub,   setEditingSub]   = useState(null);
    const [lastApprovedId, setLastApprovedId] = useState(null);

    const [formData, setFormData] = useState({
        serviceName: '',
        cost: '',
        billingCycle: 'MONTHLY',
        category: 'Other',
        nextBillingDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        isTrial: false,
        trialEndsAt: '',
    });

    // ── Data query ────────────────────────────────────────────────────────────
    const { data: subscriptions = [], isLoading } = useQuery({
        queryKey: ['subscriptions', userId, statusFilter],
        queryFn: () => {
            const status = statusFilter === 'PENDING' ? 'SUGGESTED' : (statusFilter === 'ALL' ? undefined : statusFilter);
            return fetchSubscriptions(userId, status);
        },
        enabled: !!userId,
    });

    const visibleSubs = subscriptions.filter(s => s.status !== 'IGNORED');

    // ── Derived stats ─────────────────────────────────────────────────────────
    const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length;
    const totalMonthlyCost = subscriptions.reduce((acc, sub) => {
        if (sub.status !== 'ACTIVE') return acc;
        if (sub.billingCycle === 'MONTHLY') return acc + sub.cost;
        if (sub.billingCycle === 'YEARLY')  return acc + sub.cost / 12;
        if (sub.billingCycle === 'WEEKLY')  return acc + sub.cost * 4.33;
        return acc;
    }, 0);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const addMut = useMutation({
        mutationFn: (data) => addSubscription(userId, data),
        onSuccess: () => { invalidateAll(queryClient); closeModal(); },
    });

    const editMut = useMutation({
        mutationFn: ({ id, data }) => updateSubscription(id, data),
        onSuccess: () => { invalidateAll(queryClient); closeModal(); },
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }) => updateSubscriptionStatus(id, status),
        onSuccess: (_, variables) => {
            invalidateAll(queryClient);
            if (variables.status === 'ACTIVE') {
                setLastApprovedId(variables.id);
                setTimeout(() => setLastApprovedId(null), 5000);
            }
        },
        onError: (err) => alert(`Action failed: ${err.message}`),
    });

    const ignoreMut = useMutation({
        mutationFn: (id) => ignoreSubscription(id),
        onSuccess: () => invalidateAll(queryClient),
        onError:   (err) => alert(`Ignore action failed: ${err.message}`),
    });

    const payMut = useMutation({
        mutationFn: (id) => paySubscription(id),
        onSuccess: () => invalidateAll(queryClient),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => deleteSubscription(id),
        onSuccess: () => invalidateAll(queryClient),
    });

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingSub(null);
        setFormData({
            serviceName: '', cost: '', billingCycle: 'MONTHLY', category: 'Other',
            nextBillingDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
            isTrial: false, trialEndsAt: '',
        });
        setIsModalOpen(true);
    };

    const openEditModal = (sub) => {
        setEditingSub(sub);
        setFormData({
            serviceName: sub.serviceName,
            cost: sub.cost,
            billingCycle: sub.billingCycle || 'MONTHLY',
            category: sub.category || 'Other',
            nextBillingDate: dayjs(sub.nextBillingDate).format('YYYY-MM-DD'),
            isTrial: !!sub.trialEndsAt,
            trialEndsAt: sub.trialEndsAt ? dayjs(sub.trialEndsAt).format('YYYY-MM-DD') : '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingSub(null); };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            cost: parseFloat(formData.cost),
            nextBillingDate: new Date(formData.nextBillingDate).toISOString(),
            // Only send trialEndsAt when the toggle is on
            trialEndsAt: formData.isTrial && formData.trialEndsAt
                ? new Date(formData.trialEndsAt).toISOString()
                : null,
        };
        if (editingSub) editMut.mutate({ id: editingSub._id, data: payload });
        else addMut.mutate(payload);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Page header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-background mb-3">Subscriptions</h1>
                    <p className="text-on-surface-variant text-lg">
                        {statusFilter === 'ALL' ? (
                            <>You have <span className="text-primary font-bold">{activeCount} active</span> services costing <span className="text-primary font-bold">${totalMonthlyCost.toFixed(2)}</span> / mo.</>
                        ) : (
                            <>Viewing {statusFilter.toLowerCase()} subscriptions.</>
                        )}
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex bg-surface-container-low p-1.5 rounded-full self-start md:self-end">
                    {['ALL', 'ACTIVE', 'PENDING'].map(sf => (
                        <button key={sf}
                            onClick={() => setStatusFilter(sf)}
                            className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all ${statusFilter === sf ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:bg-surface-container/50'}`}>
                            {sf === 'ALL' ? 'All' : sf.charAt(0) + sf.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </header>

            {/* Card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                {/* Add CTA tile */}
                <button onClick={openAddModal}
                    className="group relative border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </div>
                    <h3 className="text-xl font-bold text-on-surface">Add Service</h3>
                    <p className="text-on-surface-variant text-sm mt-2 max-w-[200px]">Track a new subscription manually</p>
                </button>

                {/* Loading skeletons */}
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-surface-container-lowest rounded-2xl min-h-[300px] animate-pulse" />
                ))}

                {/* Subscription cards */}
                {visibleSubs.map(sub => (
                    <SubscriptionCard
                        key={sub._id}
                        sub={sub}
                        lastApprovedId={lastApprovedId}
                        onEdit={openEditModal}
                        onStatusChange={(vars) => statusMut.mutate(vars)}
                        onIgnore={(id) => ignoreMut.mutate(id)}
                        onPay={(id) => payMut.mutate(id)}
                        onDelete={(id) => deleteMut.mutate(id)}
                        onDismissApproved={() => setLastApprovedId(null)}
                        isMutating={statusMut.isPending || ignoreMut.isPending}
                    />
                ))}
            </div>

            {/* Empty state */}
            {visibleSubs.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-outline-variant text-[40px]">
                            {statusFilter === 'PENDING' ? 'verified' : 'inventory_2'}
                        </span>
                    </div>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight mb-2">
                        {statusFilter === 'PENDING' ? "You're all caught up!" : 'No subscriptions found'}
                    </h3>
                    <p className="text-on-surface-variant max-w-xs leading-relaxed">
                        {statusFilter === 'PENDING'
                            ? 'No new subscriptions were detected in your Gmail recently.'
                            : 'Try switching your filter or adding a new service manually.'}
                    </p>
                </div>
            )}

            {/* Add / Edit modal */}
            <SubscriptionModal
                isOpen={isModalOpen}
                editingSub={editingSub}
                formData={formData}
                onFormChange={(patch) => setFormData(prev => ({ ...prev, ...patch }))}
                onSubmit={handleFormSubmit}
                onClose={closeModal}
                isPending={addMut.isPending || editMut.isPending}
            />
        </div>
    );
};

export default SubscriptionsGrid;
