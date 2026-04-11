import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuth } from '../lib/AuthContext';
import { fetchSubscriptions, addSubscription, updateSubscription, updateSubscriptionStatus, paySubscription, deleteSubscription } from '../lib/api';

const CATEGORIES = ['Entertainment', 'Software', 'News', 'Gaming', 'Music', 'Fitness', 'Education', 'Cloud', 'Other'];

const SubscriptionsGrid = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    
    const [view, setView] = useState('grid');
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, PAUSED, CANCELLED
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState(null);
    const [formData, setFormData] = useState({
        serviceName: '',
        cost: '',
        billingCycle: 'MONTHLY',
        category: 'Other',
        nextBillingDate: dayjs().add(1, 'month').format('YYYY-MM-DD')
    });

    const { data: subscriptions = [], isLoading } = useQuery({
        queryKey: ['subscriptions', userId, statusFilter],
        queryFn: () => fetchSubscriptions(userId, statusFilter === 'ALL' ? undefined : statusFilter),
        enabled: !!userId
    });

    // Mutations
    const addMut = useMutation({
        mutationFn: (data) => addSubscription(userId, data),
        onSuccess: () => { queryClient.invalidateQueries(['subscriptions']); closeModal(); }
    });
    
    const editMut = useMutation({
        mutationFn: ({ id, data }) => updateSubscription(id, data),
        onSuccess: () => { queryClient.invalidateQueries(['subscriptions']); closeModal(); }
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }) => updateSubscriptionStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries(['subscriptions'])
    });

    const payMut = useMutation({
        mutationFn: (id) => paySubscription(id),
        onSuccess: () => queryClient.invalidateQueries(['subscriptions'])
    });

    const deleteMut = useMutation({
        mutationFn: (id) => deleteSubscription(id),
        onSuccess: () => queryClient.invalidateQueries(['subscriptions'])
    });

    // Compute stats from current view
    const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length;
    const totalMonthlyCost = subscriptions.reduce((acc, sub) => {
        if (sub.status !== 'ACTIVE') return acc;
        if (sub.billingCycle === 'MONTHLY') return acc + sub.cost;
        if (sub.billingCycle === 'YEARLY') return acc + (sub.cost / 12);
        if (sub.billingCycle === 'WEEKLY') return acc + (sub.cost * 4.33);
        return acc;
    }, 0);

    const openAddModal = () => {
        setEditingSub(null);
        setFormData({
            serviceName: '', cost: '', billingCycle: 'MONTHLY', category: 'Other',
            nextBillingDate: dayjs().add(1, 'month').format('YYYY-MM-DD')
        });
        setIsModalOpen(true);
    };

    const openEditModal = (sub) => {
        setEditingSub(sub);
        setFormData({
            serviceName: sub.serviceName,
            cost: sub.cost,
            billingCycle: sub.billingCycle,
            category: sub.category || 'Other',
            nextBillingDate: dayjs(sub.nextBillingDate).format('YYYY-MM-DD')
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSub(null);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            cost: parseFloat(formData.cost),
            nextBillingDate: new Date(formData.nextBillingDate).toISOString()
        };
        
        if (editingSub) {
            editMut.mutate({ id: editingSub._id, data: payload });
        } else {
            addMut.mutate(payload);
        }
    };

    const getCardTheme = (category) => {
        const catThemes = {
            Entertainment: { bg: 'bg-primary', text: 'text-primary', grad: 'from-primary/10', ring: 'shadow-primary/30', icon: 'movie' },
            Software: { bg: 'bg-secondary', text: 'text-secondary', grad: 'from-secondary/10', ring: 'shadow-secondary/30', icon: 'terminal' },
            News: { bg: 'bg-tertiary', text: 'text-tertiary', grad: 'from-tertiary/10', ring: 'shadow-tertiary/30', icon: 'newspaper' },
            Gaming: { bg: 'bg-error', text: 'text-error', grad: 'from-error/10', ring: 'shadow-error/30', icon: 'sports_esports' },
            Music: { bg: 'bg-on-secondary-fixed-variant', text: 'text-on-secondary-fixed-variant', grad: 'from-on-secondary-fixed-variant/10', ring: 'shadow-on-secondary-fixed-variant/30', icon: 'music_note' },
            Fitness: { bg: 'bg-primary', text: 'text-primary', grad: 'from-primary/10', ring: 'shadow-primary/30', icon: 'fitness_center' },
            Cloud: { bg: 'bg-tertiary', text: 'text-tertiary', grad: 'from-tertiary/10', ring: 'shadow-tertiary/30', icon: 'cloud' }
        };
        return catThemes[category] || { bg: 'bg-on-background', text: 'text-on-background', grad: 'from-on-background/10', ring: 'shadow-on-background/30', icon: 'sell' };
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
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
                
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    {/* View & Filter Tabs */}
                    <div className="flex bg-surface-container-low p-1.5 rounded-full self-start md:self-end">
                        {['ALL', 'ACTIVE', 'PAUSED', 'CANCELLED'].map(sf => (
                            <button key={sf}
                                onClick={() => setStatusFilter(sf)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${statusFilter === sf ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:bg-surface-container/50'}`}>
                                {sf === 'ALL' ? 'All' : sf.charAt(0) + sf.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Add New CTA */}
                <button onClick={openAddModal}
                    className="group relative border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </div>
                    <h3 className="text-xl font-bold text-on-surface">Add Service</h3>
                    <p className="text-on-surface-variant text-sm mt-2 max-w-[200px]">Track a new subscription manually</p>
                </button>

                {isLoading && (
                    Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="bg-surface-container-lowest rounded-2xl min-h-[300px] animate-pulse" />
                    ))
                )}

                {subscriptions.map(sub => {
                    const theme = getCardTheme(sub.category);
                    const daysLeft = dayjs(sub.nextBillingDate).diff(dayjs(), 'day');
                    const progress = Math.max(0, Math.min(100, (daysLeft / 30) * 100)); // Rough estimate
                    
                    return (
                        <div key={sub._id} className={`group relative bg-surface-container-lowest rounded-2xl p-8 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden ${sub.status !== 'ACTIVE' ? 'opacity-70 grayscale-[50%]' : ''}`}>
                            {sub.status === 'ACTIVE' && (
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.grad} to-transparent rounded-bl-[100px] pointer-events-none`} />
                            )}
                            
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className={`w-14 h-14 ${theme.bg} rounded-full flex items-center justify-center shadow-lg ${theme.ring}`}>
                                    <span className="material-symbols-outlined text-white text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>{theme.icon}</span>
                                </div>
                                <div className="group/menu relative">
                                    <button className="material-symbols-outlined text-outline-variant hover:text-on-surface hover:bg-surface-container-low w-8 h-8 rounded-full transition-colors flex items-center justify-center">
                                        more_vert
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/10 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 py-2">
                                        <button onClick={() => openEditModal(sub)} className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">edit</span> Edit</button>
                                        
                                        {sub.status === 'ACTIVE' ? (
                                            <button onClick={() => statusMut.mutate({id: sub._id, status: 'PAUSED'})} className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-container-low flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">pause</span> Pause</button>
                                        ) : (
                                            <button onClick={() => statusMut.mutate({id: sub._id, status: 'ACTIVE'})} className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-surface-container-low flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">play_arrow</span> Resume</button>
                                        )}
                                        
                                        <hr className="my-2 border-outline-variant/10" />
                                        <button onClick={() => deleteMut.mutate(sub._id)} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">delete</span> Delete</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-on-background tracking-tight">{sub.serviceName}</h3>
                                <p className="text-on-surface-variant text-sm font-medium flex items-center gap-1.5 mt-1">
                                    {sub.category}
                                    {sub.status === 'PAUSED' && <span className="bg-surface-container px-2 py-0.5 rounded text-xs">PAUSED</span>}
                                    {sub.status === 'CANCELLED' && <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded text-xs">CANCELLED</span>}
                                </p>
                            </div>
                            
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">{sub.billingCycle}</p>
                                    <p className="text-3xl font-black text-on-background tracking-tighter">${sub.cost.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">Next Bill</p>
                                    <p className="text-on-surface font-semibold text-sm">{dayjs(sub.nextBillingDate).format('MMM DD, YYYY')}</p>
                                </div>
                            </div>
                            
                            {sub.status === 'ACTIVE' && (
                                <div className="space-y-3">
                                    <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                                        <div className={`${theme.bg} h-full rounded-full transition-all`} style={{ width: `${Math.max(5, progress)}%`}} />
                                    </div>
                                    <button 
                                        onClick={() => payMut.mutate(sub._id)}
                                        disabled={payMut.isPending}
                                        className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Mark Paid
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black tracking-tighter text-on-surface">{editingSub ? 'Edit Subscription' : 'Add Subscription'}</h2>
                            <button onClick={closeModal} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-2 rounded-full">close</button>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant ml-1">Service Name</label>
                                <input required type="text" value={formData.serviceName} onChange={e => setFormData({...formData, serviceName: e.target.value})} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-on-surface" placeholder="e.g. Netflix" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant ml-1">Cost ($)</label>
                                    <input required type="number" step="0.01" min="0" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-on-surface" placeholder="0.00" />
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant ml-1">Cycle</label>
                                    <select value={formData.billingCycle} onChange={e => setFormData({...formData, billingCycle: e.target.value})} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-on-surface">
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="YEARLY">Yearly</option>
                                        <option value="WEEKLY">Weekly</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant ml-1">Category</label>
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-on-surface">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1 pb-4">
                                <label className="text-xs font-bold uppercase tracking-wide text-on-surface-variant ml-1">Next Billing Date</label>
                                <input required type="date" value={formData.nextBillingDate} onChange={e => setFormData({...formData, nextBillingDate: e.target.value})} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-on-surface color-scheme-light" />
                            </div>

                            <button type="submit" disabled={addMut.isPending || editMut.isPending} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dim transition-colors flex items-center justify-center gap-2">
                                {(addMut.isPending || editMut.isPending) ? 'Saving...' : 'Save Subscription'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionsGrid;
