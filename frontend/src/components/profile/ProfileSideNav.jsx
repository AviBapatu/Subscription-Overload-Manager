import React from 'react';

export const NAV_SECTIONS = [
    { id: 'channels',    icon: 'notifications_active', label: 'Channels' },
    { id: 'notif-types', icon: 'tune',                 label: 'Notify Me About' },
    { id: 'frequency',   icon: 'schedule',              label: 'Reminder Frequency' },
    { id: 'quiet-hours', icon: 'bedtime',               label: 'Quiet Hours' },
    { id: 'summary',     icon: 'summarize',             label: 'Weekly Summary' },
    { id: 'budget',      icon: 'savings',               label: 'Budget Alerts' },
    { id: 'snooze',      icon: 'snooze',                label: 'Snooze & Test' },
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
    </div>
);

export default ProfileSideNav;
