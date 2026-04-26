import React from 'react';

export const NAV_SECTIONS = [
    { id: 'channels',    icon: 'notifications_active', label: 'Channels' },
    { id: 'notif-types', icon: 'tune',                 label: 'Notify Me About' },
    { id: 'frequency',   icon: 'schedule',              label: 'Reminder Frequency' },
    { id: 'quiet-hours', icon: 'bedtime',               label: 'Quiet Hours' },
    { id: 'summary',     icon: 'summarize',             label: 'Weekly Summary' },
    { id: 'budget',      icon: 'savings',               label: 'Budget Alerts' },
    { id: 'snooze',      icon: 'snooze',                label: 'Snooze & Test' },
    { id: 'advanced',    icon: 'settings_suggest',      label: 'Advanced' },
];

/**
 * ProfileSideNav — sticky left sidebar with scroll-spy highlighting and
 * an "Upgrade to Premium" upsell card.
 */
const ProfileSideNav = ({ activeSection }) => (
    <div className="hidden lg:flex lg:col-span-3 flex-col gap-1.5 sticky top-28 self-start">
        {NAV_SECTIONS.map(s => {
            const isActive = activeSection === s.id;
            return (
                <a key={s.id} href={`#${s.id}`}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-all rounded-xl font-medium text-sm group ${
                        isActive
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                    }`}>
                    <span className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>
                        {s.icon}
                    </span>
                    <span>{s.label}</span>
                </a>
            );
        })}

        {/* Upsell card */}
        <div className="mt-6 p-5 bg-gradient-to-br from-secondary to-primary-dim rounded-2xl text-white flex flex-col gap-3 shadow-lg shadow-blue-500/10">
            <p className="font-bold leading-tight">Upgrade to Premium</p>
            <p className="text-xs text-white/80">Advanced analytics & family sharing.</p>
            <button className="w-full py-2 bg-white text-primary font-bold rounded-xl text-sm hover:scale-[1.02] transition-transform">Learn More</button>
        </div>
    </div>
);

export default ProfileSideNav;
