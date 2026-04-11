import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TopNavBar = () => {
  const location = useLocation();

  const getLinkClass = (path) => {
    return location.pathname === path
      ? "text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 font-inter tracking-tight py-1"
      : "text-on-surface-variant dark:text-slate-400 hover:bg-surface-bright/10 dark:hover:bg-slate-800 transition-all duration-400 font-inter tracking-tight py-1 px-3 rounded-lg";
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-none flex justify-between items-center px-10 py-4 max-w-full">
      <div className="flex items-center gap-8">
        <span className="text-2xl font-bold tracking-tighter text-on-surface dark:text-white font-inter tracking-tight">The Concierge</span>
        <div className="hidden md:flex gap-6 items-center">
          <Link className={getLinkClass('/')} to="/">Dashboard</Link>
          <Link className={getLinkClass('/subscriptions')} to="/subscriptions">Subscriptions</Link>
          <Link className={getLinkClass('/profile')} to="/profile">Profile</Link>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">search</span>
          </div>
          <input className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 w-64 focus:ring-2 focus:ring-primary/20 text-sm font-inter" placeholder="Search insights..." type="text"/>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-bright/10 transition-all">
            <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
          </button>
          <button className="bg-primary text-on-primary px-6 py-2 rounded-full font-semibold text-sm hover:scale-105 transition-all shadow-md">
            Add Subscription
          </button>
          <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6wu3EW7MrlOFY7iXmqSokHrI7PkJbY0rBbnEhx9o8ZzNJ7R-qOnPhKBvtFAgs7Kk5IlXBa-GlQtP58eDgxr5MhN61CGJU_oAH90FkCX6jdqk7uM1szkFzVDJ6htSb1GATd0EtfxOO-SbZBnxR7WJxY0kSKiFqPaIrWmOCfWAucoLCymW0lAEsi3cLH_Rd1QJxqX5Benj5MISKLxKArr64iLXH0ybHxnM9L59TNIqfNwz-HrjdGtwO-gTZye4dF1K5qADX_rAl9qQZ"/>
        </div>
      </div>
    </nav>
  );
};

export default TopNavBar;
