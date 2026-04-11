import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchUser, updateUserPreferences } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const Profile = () => {
    const { userId } = useAuth();
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => fetchUser(userId),
        enabled: !!userId
    });

    const [prefs, setPrefs] = useState({
        notifyViaEmail: true,
        notifyViaWhatsApp: false,
        alertDaysBefore: 3
    });

    // Sync local state when user data is fetched
    useEffect(() => {
        if (user && user.preferences) {
            setPrefs(user.preferences);
        }
    }, [user]);

    const prefMut = useMutation({
        mutationFn: (newPrefs) => updateUserPreferences(userId, newPrefs),
        onSuccess: () => queryClient.invalidateQueries(['user', userId])
    });

    const handleToggle = (key) => {
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        prefMut.mutate(updated);
    };

    const handleSelectChange = (e) => {
        const updated = { ...prefs, alertDaysBefore: parseInt(e.target.value) };
        setPrefs(updated);
        prefMut.mutate(updated);
    };

    if (isLoading) return <div className="p-10 text-center">Loading profile...</div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-12">
            {/* Profile Header Section */}
            <section className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-surface-container-lowest">
                <div className="h-48 w-full bg-gradient-to-r from-primary to-tertiary opacity-90 relative">
                     <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                </div>
                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-6 -mt-16 relative z-10">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-white shadow-xl bg-surface-container-highest flex items-center justify-center text-5xl font-black text-on-surface-variant">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-grow pb-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">{user?.name || 'User'}</h1>
                        <p className="text-on-surface-variant font-medium mt-1">{user?.email}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mt-2">Member since {dayjs(user?.createdAt).format('MMMM YYYY')}</p>
                    </div>
                    <div className="flex gap-3 pb-2">
                        <button className="px-6 py-2.5 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface font-semibold text-sm transition-all hover:bg-surface-container-high">Edit Profile</button>
                    </div>
                </div>
            </section>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Side Navigation Links (Desktop) */}
                <div className="hidden lg:flex lg:col-span-3 flex-col gap-2">
                    <a className="flex items-center gap-3 px-4 py-3 bg-surface-container-lowest shadow-sm text-primary rounded-xl font-bold" href="#">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>notifications</span>
                        <span>Preferences</span>
                    </a>
                    <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-all rounded-xl font-medium" href="#">
                        <span className="material-symbols-outlined">person</span>
                        <span>Account</span>
                    </a>
                    <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-all rounded-xl font-medium" href="#">
                        <span className="material-symbols-outlined">lock</span>
                        <span>Security</span>
                    </a>
                    
                    <div className="mt-8 p-6 bg-gradient-to-br from-secondary to-primary-dim rounded-2xl text-white flex flex-col gap-4 shadow-lg shadow-blue-500/10">
                        <p className="font-bold text-lg leading-tight">Upgrade to Premium</p>
                        <p className="text-sm text-white/80">Unlock advanced subscription analytics and family sharing.</p>
                        <button className="w-full py-2.5 bg-white text-primary font-bold rounded-xl text-sm hover:scale-[1.02] transition-transform">Learn More</button>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-9 flex flex-col gap-8">
                    {/* Notification Settings Card */}
                    <div className="bg-surface-container-lowest rounded-2xl p-8 md:p-10 shadow-sm border border-outline-variant/10">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-outline-variant/10">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[28px]">notifications_active</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-on-surface">Alert Preferences</h2>
                                <p className="text-on-surface-variant text-sm mt-1">Manage how and when we notify you</p>
                            </div>
                        </div>
                        
                        <div className="space-y-8">
                            {/* Email Notification */}
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col pr-4">
                                    <span className="font-bold text-on-surface text-lg">Email Alerts</span>
                                    <span className="text-sm text-on-surface-variant mt-1">Billing alerts sent to {user?.email}</span>
                                </div>
                                <button 
                                    onClick={() => handleToggle('notifyViaEmail')}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${prefs.notifyViaEmail ? 'bg-primary' : 'bg-surface-container-highest'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${prefs.notifyViaEmail ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            {/* WhatsApp Notification */}
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col pr-4">
                                    <span className="font-bold text-on-surface text-lg">WhatsApp Concierge</span>
                                    <span className="text-sm text-on-surface-variant mt-1">Instant chat alerts for renewals</span>
                                </div>
                                <button 
                                    onClick={() => handleToggle('notifyViaWhatsApp')}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${prefs.notifyViaWhatsApp ? 'bg-primary' : 'bg-surface-container-highest'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${prefs.notifyViaWhatsApp ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            
                            {/* Alert Timing */}
                            <div className="pt-8 border-t border-outline-variant/10">
                                <label className="flex flex-col gap-2">
                                    <span className="font-bold text-on-surface text-lg">Alert Timing</span>
                                    <span className="text-sm text-on-surface-variant mb-2">How many days before renewal should we notify you?</span>
                                    <div className="relative max-w-xs">
                                        <select 
                                            value={prefs.alertDaysBefore} 
                                            onChange={handleSelectChange}
                                            className="w-full appearance-none bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-on-surface font-semibold focus:ring-2 focus:ring-primary transition-all outline-none"
                                        >
                                            <option value={1}>1 Day Before</option>
                                            <option value={3}>3 Days Before</option>
                                            <option value={7}>7 Days Before</option>
                                            <option value={14}>14 Days Before</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-3.5 pointer-events-none text-on-surface-variant">expand_more</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats/Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex flex-col gap-3">
                            <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant mb-2">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <h3 className="font-bold text-lg">Timezone</h3>
                            <p className="text-sm text-on-surface-variant">Current configured timezone is <strong className="text-on-surface">{user?.timezone}</strong>. Alerts are dispatched at 12:00 AM local time.</p>
                        </div>
                        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex flex-col gap-3">
                            <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant mb-2">
                                <span className="material-symbols-outlined">call</span>
                            </div>
                            <h3 className="font-bold text-lg">Phone Number</h3>
                            <p className="text-sm text-on-surface-variant">
                                {user?.phoneNumber ? `Connected: ${user.phoneNumber}` : 'No phone number connected for WhatsApp alerts.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
