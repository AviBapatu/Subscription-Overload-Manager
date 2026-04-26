import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const TopNavBar = () => {
    const location = useLocation();
    const { logout, user } = useAuth();
    
    // Minimal tabs
    const navItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Subscriptions', path: '/subscriptions' }
    ];

    return (
        <header className="fixed top-0 inset-x-0 h-20 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/10 z-50 transition-all duration-300">
            <div className="h-full max-w-[1600px] mx-auto px-6 md:px-10 flex items-center justify-between">
                
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-white text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>inventory_2</span>
                    </div> */}
                    <span className="font-black text-xl tracking-tight hidden sm:block text-on-surface">The Concierge</span>
                </Link>

                {/* Main Navigation (Desktop) */}
                <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-low rounded-full p-1 border border-outline-variant/10 shadow-sm">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                                    isActive 
                                    ? 'bg-white text-primary shadow-sm' 
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5'
                                }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors relative">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full pointer-events-none"></span>
                    </button>
                    
                    <div className="h-6 w-[1px] bg-outline-variant/20 hidden sm:block"></div>
                    
                    <div className="flex items-center gap-3">
                        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-surface-container-lowest shadow-sm overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-black">
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt={user.name || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                                )}
                            </div>
                            <span className="text-sm font-bold hidden lg:block text-on-surface">{user?.name || 'User'}</span>
                        </Link>
                        
                        <button onClick={logout} className="w-10 h-10 flex items-center justify-center text-error/80 hover:text-error hover:bg-error/10 rounded-full transition-colors ml-1" title="Sign Out">
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopNavBar;
