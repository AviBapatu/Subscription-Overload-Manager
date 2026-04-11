import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileNav = () => {
  const location = useLocation();

  const getLinkClass = (path) => {
    return location.pathname === path
      ? "flex flex-col items-center gap-1 text-primary"
      : "flex flex-col items-center gap-1 text-on-surface-variant";
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest flex justify-around p-4 shadow-2xl border-t border-surface-container-high z-50">
      <Link to="/" className={getLinkClass('/')}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
        <span className="text-[10px] font-bold">Dashboard</span>
      </Link>
      <Link to="/subscriptions" className={getLinkClass('/subscriptions')}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/subscriptions' ? "'FILL' 1" : "'FILL' 0" }}>grid_view</span>
        <span className="text-[10px] font-bold">Subs</span>
      </Link>
      <Link to="/profile" className={getLinkClass('/profile')}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: location.pathname === '/profile' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
        <span className="text-[10px] font-bold">Profile</span>
      </Link>
    </div>
  );
};

export default MobileNav;
