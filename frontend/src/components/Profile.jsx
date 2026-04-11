import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const Profile = () => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col gap-12">
            {/* Profile Header Section */}
            <section className="relative w-full rounded-xl overflow-hidden shadow-sm bg-surface-container-lowest">
                <div className="h-48 w-full bg-gradient-to-r from-primary to-tertiary opacity-90" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC-QJoFBkDLU-3GzIy5NymRz7Th67krmc5xQ0hC0bzwfb0gNkTriZmBdMaG4DE-nIhlPijkHGUj4SvjnLyz0cex6PNxfeYjvUPSFmhsgp7-Fiv9NN13Iqp6B-S3BGbGAzMkXW615k7PbWLc0a6EhbyExrJfuOTlrMjkKYogVBYgNGjLRH6CIE-4RAtN1cW52dqQyrJSCPelxsOn_a7hecKSGdQ-HJWLxWefrcZXCLAFKF5UkBH9mlaM6PV1qPOgTDWxnA1tS5oD1MLS')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                </div>
                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-6 -mt-16 relative z-10">
                    <img alt="User avatar" className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover border-4 border-white shadow-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLExBB3Tb4n3rWRv-yAYrV_1hpGjNBcb3kCnd4Ws-MeWwDR9Sd38gbw1tXsO2J-d4kLSPYQh-v9TfibXkScTD7mPiO1qc_Px_gv1_qPxA_ngjgQBDRgR0YsJUmY74hxFC3NoW17mCTA0u-qgYjFAEwTMk6AzohtfibkOnmL6rNJRMoMa_vndipxqL4WKFJ5pxgAYFhy5o5XYtneHpzXHr7-uoRHyTEuWZj9PBc8Adevv3m2ePdFLSOSDJQ0Q3a0d8IaFzqnZaXxFOH" />
                    <div className="flex-grow pb-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">Alexandria Bennett</h1>
                        <p className="text-on-surface-variant font-medium">Digital Curator Tier • Member since 2023</p>
                    </div>
                    <div className="flex gap-3 pb-2">
                        <button className="px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface font-semibold text-sm transition-all hover:scale-105">Edit Profile</button>
                    </div>
                </div>
            </section>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Side Navigation Links (Desktop) */}
                <div className="hidden lg:flex lg:col-span-3 flex-col gap-2">
                    <a className="flex items-center gap-3 px-4 py-3 bg-white shadow-sm text-blue-600 rounded-xl font-semibold" href="#">
                        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
                        <span>Account</span>
                    </a>
                    <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-all rounded-xl" href="#">
                        <span className="material-symbols-outlined">notifications</span>
                        <span>Notifications</span>
                    </a>
                    <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-all rounded-xl" href="#">
                        <span className="material-symbols-outlined">lock</span>
                        <span>Security</span>
                    </a>
                    <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-all rounded-xl" href="#">
                        <span className="material-symbols-outlined">payments</span>
                        <span>Billing</span>
                    </a>
                    
                    <div className="mt-8 p-6 bg-gradient-to-br from-secondary to-primary-dim rounded-lg text-on-primary flex flex-col gap-4 shadow-lg shadow-blue-500/10 hover:scale-[1.02] transition-transform cursor-pointer">
                        <p className="font-bold text-lg leading-tight">Upgrade to Premium</p>
                        <p className="text-sm opacity-90">Unlock advanced subscription analytics and automatic cancellations.</p>
                        <button className="w-full py-2 bg-white text-primary font-bold rounded-full text-sm hover:bg-surface-bright transition-colors">Learn More</button>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-9 flex flex-col gap-8">
                    {/* Notification Settings Card */}
                    <div className="bg-surface-container-lowest rounded-lg p-8 shadow-[0_20px_40px_rgba(0,88,187,0.04)]">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-primary-container/20 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">notifications_active</span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">Notification Preferences</h2>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Email Notification */}
                            <div className="flex items-center justify-between py-2">
                                <div className="flex flex-col">
                                    <span className="font-bold text-on-surface text-lg">Email Alerts</span>
                                    <span className="text-sm text-on-surface-variant">Weekly summaries and billing alerts.</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input defaultChecked className="sr-only peer" type="checkbox" />
                                    <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-secondary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                            </div>
                            {/* WhatsApp Notification */}
                            <div className="flex items-center justify-between py-2">
                                <div className="flex flex-col">
                                    <span className="font-bold text-on-surface text-lg">WhatsApp Concierge</span>
                                    <span className="text-sm text-on-surface-variant">Instant chat alerts for suspicious price hikes.</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input className="sr-only peer" type="checkbox" />
                                    <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-secondary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                            </div>
                            {/* Reminder Preferences */}
                            <div className="flex items-center justify-between py-2">
                                <div className="flex flex-col">
                                    <span className="font-bold text-on-surface text-lg">Reminder Preferences</span>
                                    <span className="text-sm text-on-surface-variant">Notify me before trial period ends.</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input defaultChecked className="sr-only peer" type="checkbox" />
                                    <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-secondary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                            </div>
                            
                            <div className="pt-6 mt-6 border-t border-surface-container-low flex flex-col md:flex-row gap-6">
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-sm font-bold text-on-surface-variant px-1">Check Frequency</label>
                                    <div className="relative group">
                                        <select className="w-full appearance-none bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary-container transition-all" defaultValue="Every 3 Days">
                                            <option value="Daily Scans">Daily Scans</option>
                                            <option value="Every 3 Days">Every 3 Days</option>
                                            <option value="Weekly Analysis">Weekly Analysis</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-3 pointer-events-none text-on-surface-variant">expand_more</span>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col gap-2">
                                    <label className="text-sm font-bold text-on-surface-variant px-1">Data Retention</label>
                                    <div className="relative group">
                                        <select className="w-full appearance-none bg-surface-container-low border-none rounded-lg px-4 py-3 text-on-surface font-medium focus:ring-2 focus:ring-primary-container transition-all" defaultValue="Indefinite">
                                            <option value="3 Months">3 Months</option>
                                            <option value="1 Year">1 Year</option>
                                            <option value="Indefinite">Indefinite</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-3 pointer-events-none text-on-surface-variant">expand_more</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bento Style Privacy/Security Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface-container-lowest rounded-lg p-6 shadow-[0_20px_40px_rgba(0,88,187,0.02)] flex flex-col gap-4 hover:shadow-[0_30px_60px_rgba(0,88,187,0.06)] transition-shadow">
                            <div className="w-12 h-12 bg-tertiary-container/20 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-tertiary">verified_user</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Two-Factor Auth</h3>
                                <p className="text-sm text-on-surface-variant">Active since March 2024 via Authenticator App.</p>
                            </div>
                            <button className="mt-auto text-primary text-sm font-bold flex items-center gap-1 hover:underline w-fit">
                                Manage Security <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                        <div className="bg-surface-container-lowest rounded-lg p-6 shadow-[0_20px_40px_rgba(0,88,187,0.02)] flex flex-col gap-4 hover:shadow-[0_30px_60px_rgba(0,88,187,0.06)] transition-shadow">
                            <div className="w-12 h-12 bg-secondary-container/30 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-secondary">sync</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Auto-Sync Bank</h3>
                                <p className="text-sm text-on-surface-variant">4 connected accounts are currently syncing flawlessly.</p>
                            </div>
                            <button className="mt-auto text-secondary text-sm font-bold flex items-center gap-1 hover:underline w-fit">
                                View Connections <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-4 p-8 border-2 border-dashed border-error-container/20 rounded-lg bg-error-container/5">
                        <h3 className="text-error font-bold text-lg mb-2">Danger Zone</h3>
                        <p className="text-on-surface-variant text-sm mb-6">Once you delete your account, there is no going back. Please be certain.</p>
                        <button className="px-8 py-3 bg-white border border-error-container/30 text-error font-bold rounded-full transition-all hover:bg-error hover:text-white">Delete Account</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
