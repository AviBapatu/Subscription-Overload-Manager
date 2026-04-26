import React from 'react';
import dayjs from 'dayjs';

/**
 * ProfileHeader — cover banner, avatar, name, email, and member-since date.
 */
const ProfileHeader = ({ user }) => (
    <section className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-surface-container-lowest">
        <div className="h-40 w-full bg-gradient-to-r from-primary to-tertiary opacity-90 relative">
            <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
        </div>
        <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-14 relative z-10">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white shadow-xl bg-surface-container-highest flex items-center justify-center text-5xl font-black text-on-surface-variant shrink-0 overflow-hidden">
                {user?.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                    user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
            </div>
            <div className="flex-1 pb-1">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">{user?.name || 'User'}</h1>
                <p className="text-on-surface-variant font-medium mt-0.5 text-sm">{user?.email}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-outline-variant mt-1.5">
                    Member since {dayjs(user?.createdAt).format('MMMM YYYY')}
                </p>
            </div>
        </div>
    </section>
);

export default ProfileHeader;
