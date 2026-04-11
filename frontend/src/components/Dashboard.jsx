import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSubscriptions, seedUserIfNeeded } from '../lib/api';
import dayjs from 'dayjs';

const Dashboard = () => {
  useEffect(() => { seedUserIfNeeded() }, []);

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions
  });

  const totalMonthlyCost = subscriptions?.reduce((acc, sub) => {
    if (sub.status !== 'ACTIVE') return acc;
    if (sub.billingCycle === 'MONTHLY') return acc + sub.cost;
    if (sub.billingCycle === 'YEARLY') return acc + (sub.cost / 12);
    if (sub.billingCycle === 'WEEKLY') return acc + (sub.cost * 4.33);
    return acc;
  }, 0) || 0;

  const activeCount = subscriptions?.filter(s => s.status === 'ACTIVE').length || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section: Apple Fitness Rings */}
      <section className="mb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-6xl font-extrabold tracking-tighter text-on-surface leading-tight">
            Your digital lifestyle, <br/>
            <span className="text-primary">perfectly curated.</span>
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed max-w-lg">
            Manage {activeCount} active subscriptions. You've saved <span className="font-bold text-secondary">$42.50</span> this month through smart optimization.
          </p>
          <div className="flex gap-4">
            <button className="bg-surface-container-highest px-8 py-4 rounded-full font-bold hover:bg-surface-container-high transition-all">View Audit</button>
            <button className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">Optimize Spend</button>
          </div>
        </div>
        <div className="relative flex justify-center items-center h-[400px]">
          {/* Outer Glow */}
          <div className="absolute w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <svg className="w-80 h-80 transform -rotate-90">
            {/* Ring 1: Budget */}
            <circle className="text-surface-container-high" cx="160" cy="160" fill="transparent" r="140" stroke="currentColor" strokeWidth="24"></circle>
            <circle cx="160" cy="160" fill="transparent" r="140" stroke="url(#gradient-blue)" strokeDasharray="879.6" strokeDashoffset="260" strokeLinecap="round" strokeWidth="24"></circle>
            {/* Ring 2: Active */}
            <circle className="text-surface-container-high" cx="160" cy="160" fill="transparent" r="110" stroke="currentColor" strokeWidth="24"></circle>
            <circle cx="160" cy="160" fill="transparent" r="110" stroke="url(#gradient-purple)" strokeDasharray="691.1" strokeDashoffset="180" strokeLinecap="round" strokeWidth="24"></circle>
            {/* Ring 3: Renewals */}
            <circle className="text-surface-container-high" cx="160" cy="160" fill="transparent" r="80" stroke="currentColor" strokeWidth="24"></circle>
            <circle cx="160" cy="160" fill="transparent" r="80" stroke="url(#gradient-teal)" strokeDasharray="502.6" strokeDashoffset="120" strokeLinecap="round" strokeWidth="24"></circle>
            <defs>
              <linearGradient id="gradient-blue" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#0058bb"></stop>
                <stop offset="100%" stopColor="#6c9fff"></stop>
              </linearGradient>
              <linearGradient id="gradient-purple" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#883c93"></stop>
                <stop offset="100%" stopColor="#f39cfb"></stop>
              </linearGradient>
              <linearGradient id="gradient-teal" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#3853b7"></stop>
                <stop offset="100%" stopColor="#b4c1ff"></stop>
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-4xl font-black tracking-tighter">${totalMonthlyCost.toFixed(0)}</span>
            <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Monthly</span>
          </div>
        </div>
      </section>

      {/* Overview Cards: Bento Grid Style */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {/* Spend Card */}
        <div className="relative overflow-hidden p-8 rounded-lg surface-container-lowest shadow-sm hover:shadow-md transition-all group bg-surface-container-lowest">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <span className="material-symbols-outlined text-primary mb-4 block text-[32px]">payments</span>
              <h3 className="text-on-surface-variant font-semibold mb-1">Total Monthly Spend</h3>
              <p className="text-3xl font-black tracking-tight">${totalMonthlyCost.toFixed(2)}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-error">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>4.2% from last month</span>
            </div>
          </div>
        </div>

        {/* Bills Card */}
        <div className="relative overflow-hidden p-8 rounded-lg surface-container-lowest shadow-sm hover:shadow-md transition-all group bg-surface-container-lowest">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/10 rounded-full blur-2xl group-hover:bg-tertiary/20 transition-all"></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <span className="material-symbols-outlined text-tertiary mb-4 block text-[32px]">calendar_today</span>
              <h3 className="text-on-surface-variant font-semibold mb-1">Upcoming Bills</h3>
              <p className="text-3xl font-black tracking-tight">$112.50</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-secondary">
              <span>Next bill: Tomorrow</span>
            </div>
          </div>
        </div>

        {/* Active Card */}
        <div className="relative overflow-hidden p-8 rounded-lg surface-container-lowest shadow-sm hover:shadow-md transition-all group bg-surface-container-lowest">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all"></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <span className="material-symbols-outlined text-secondary mb-4 block text-[32px]">verified_user</span>
              <h3 className="text-on-surface-variant font-semibold mb-1">Active Services</h3>
              <p className="text-3xl font-black tracking-tight">{activeCount}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span>3 trial periods ending</span>
            </div>
          </div>
        </div>

        {/* Expensive Card */}
        <div className="relative overflow-hidden p-8 rounded-lg surface-container-lowest shadow-sm hover:shadow-md transition-all group bg-surface-container-lowest">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/10 rounded-full blur-2xl group-hover:bg-error/20 transition-all"></div>
          <div className="flex flex-col h-full justify-between relative z-10">
            <div>
              <span className="material-symbols-outlined text-error mb-4 block text-[32px]">priority_high</span>
              <h3 className="text-on-surface-variant font-semibold mb-1">Most Expensive</h3>
              <p className="text-3xl font-black tracking-tight">Adobe CC</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              <span>$54.99 per month</span>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics & Timeline Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Category Chart & Monthly Graph */}
        <div className="lg:col-span-2 space-y-10">
          <div className="p-10 rounded-lg surface-container-lowest shadow-sm bg-surface-container-lowest">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">Spending Analytics</h2>
                <p className="text-on-surface-variant">Trends over the last 6 months</p>
              </div>
              <div className="flex bg-surface-container-low p-1 rounded-full">
                <button className="px-4 py-1.5 rounded-full text-sm font-bold bg-white shadow-sm">Month</button>
                <button className="px-4 py-1.5 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-bright/50 transition-all">Year</button>
              </div>
            </div>
            {/* Spending Line Graph Visual */}
            <div className="h-64 flex items-end justify-between gap-4 relative">
              <div className="absolute inset-0 flex flex-col justify-between py-2">
                <div className="border-t border-dashed border-outline-variant/20 w-full"></div>
                <div className="border-t border-dashed border-outline-variant/20 w-full"></div>
                <div className="border-t border-dashed border-outline-variant/20 w-full"></div>
                <div className="border-t border-dashed border-outline-variant/20 w-full"></div>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-t-lg h-[40%] relative group">
                <div className="absolute inset-0 bg-primary/20 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform rounded-t-lg"></div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-background text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">$320</div>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-t-lg h-[55%] relative group">
                <div className="absolute inset-0 bg-primary/20 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform rounded-t-lg"></div>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-t-lg h-[48%] relative group">
                <div className="absolute inset-0 bg-primary/20 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform rounded-t-lg"></div>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-t-lg h-[75%] relative group">
                <div className="absolute inset-0 bg-primary/20 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform rounded-t-lg"></div>
              </div>
              <div className="flex-1 bg-primary/80 rounded-t-lg h-[92%] relative group">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-background text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">${totalMonthlyCost.toFixed(0)}</div>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-t-lg h-[65%] relative group">
                <div className="absolute inset-0 bg-primary/20 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform rounded-t-lg"></div>
              </div>
            </div>
            <div className="flex justify-between mt-6 px-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
            </div>
          </div>
          
          {/* Bento Category Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-lg surface-container-lowest flex items-center gap-8 bg-surface-container-lowest shadow-sm">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle className="text-surface-container-high" cx="64" cy="64" fill="transparent" r="50" stroke="currentColor" strokeWidth="12"></circle>
                  <circle cx="64" cy="64" fill="transparent" r="50" stroke="#883c93" strokeDasharray="314.15" strokeDashoffset="100" strokeLinecap="round" strokeWidth="12"></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">68%</div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Entertainment</h3>
                <p className="text-on-surface-variant text-sm">Netflix, Disney+, Spotify, and 4 others.</p>
              </div>
            </div>
            <div className="p-8 rounded-lg surface-container-lowest flex items-center gap-8 bg-surface-container-lowest shadow-sm">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle className="text-surface-container-high" cx="64" cy="64" fill="transparent" r="50" stroke="currentColor" strokeWidth="12"></circle>
                  <circle cx="64" cy="64" fill="transparent" r="50" stroke="#0058bb" strokeDasharray="314.15" strokeDashoffset="220" strokeLinecap="round" strokeWidth="12"></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">24%</div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Software</h3>
                <p className="text-on-surface-variant text-sm">Adobe CC, Notion, ChatGPT Plus.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-8 rounded-lg surface-container-low flex flex-col h-full bg-surface-container-low shadow-sm">
          <div className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Upcoming Renewals</h2>
            <p className="text-on-surface-variant">Don't get caught by surprise</p>
          </div>
          <div className="relative flex-grow pl-8 space-y-10">
            {/* Timeline Track */}
            <div className="absolute left-[3px] top-2 bottom-2 w-1 bg-surface-container-highest rounded-full"></div>
            
            {/* Item 1 */}
            <div className="relative">
              <div className="absolute -left-[33px] top-1.5 w-4 h-4 bg-primary rounded-full ring-4 ring-white shadow-sm shadow-primary/30"></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Oct 24 • Tomorrow</span>
                <h4 className="font-bold text-lg">Netflix Premium</h4>
                <p className="text-on-surface-variant text-sm">Monthly plan • $19.99</p>
              </div>
            </div>
            {/* Item 2 */}
            <div className="relative">
              <div className="absolute -left-[33px] top-1.5 w-4 h-4 bg-tertiary rounded-full ring-4 ring-white shadow-sm shadow-tertiary/30"></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Oct 28 • 4 days left</span>
                <h4 className="font-bold text-lg">Adobe Creative Cloud</h4>
                <p className="text-on-surface-variant text-sm">Professional suite • $54.99</p>
              </div>
            </div>
            {/* Item 3 */}
            <div className="relative">
              <div className="absolute -left-[33px] top-1.5 w-4 h-4 bg-secondary rounded-full ring-4 ring-white shadow-sm shadow-secondary/30"></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Nov 02 • 9 days left</span>
                <h4 className="font-bold text-lg">Spotify Family</h4>
                <p className="text-on-surface-variant text-sm">Music streaming • $16.99</p>
              </div>
            </div>
            {/* Item 4 */}
            <div className="relative opacity-60">
              <div className="absolute -left-[33px] top-1.5 w-4 h-4 bg-outline-variant rounded-full ring-4 ring-white"></div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Nov 15 • 22 days left</span>
                <h4 className="font-bold text-lg">Hulu (No Ads)</h4>
                <p className="text-on-surface-variant text-sm">Streaming service • $14.99</p>
              </div>
            </div>
          </div>
          <button className="mt-12 w-full py-4 border-2 border-primary/20 rounded-full font-bold text-primary hover:bg-primary/5 transition-all">
            Sync with Calendar
          </button>
        </div>
      </section>

      {/* Recommendation Banner */}
      <section className="mt-16 relative rounded-xl overflow-hidden p-12 bg-on-background text-white shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCV4UX7EetOF04R97HQFTQuFs2D-5cOzzd5mp3HJE3l9QQWCQ9G2d-S9m1-kjMFT0IUrtDaRgI4HpazRSzTC6DIOnnu5gPLygYUH1mjAzSqImVcbZy2X8SGV6YoUBMeXKbqG4WbnMO-tHZoVPTm7pykz3gikYXaJvMKNwSNbg3vavjnV4M0m4VTw4RZNE05gvTdYgnADUtqdCe1AKsk1akTH1JdEF96z0l5kjRPBF7_Hy1OrBlBJw5D13COxXq6cyco0B_7p5TAm1Km')", backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-4">You could save $12.99/mo</h2>
            <p className="text-white/70 text-lg leading-relaxed mb-6">Our algorithms detected overlapping features between Disney+ and Hulu. We recommend consolidating your plan into the Disney Bundle to reduce costs.</p>
            <button className="bg-white text-on-background px-8 py-4 rounded-full font-bold hover:scale-105 transition-all">Switch &amp; Save</button>
          </div>
          <div className="flex justify-center">
            <div className="glass-card p-6 rounded-lg bg-white/10 border border-white/10 flex items-center gap-6 max-w-sm">
              <div className="flex -space-x-4">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center border-4 border-black/20 text-xs font-bold">D+</div>
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center border-4 border-black/20 text-xs font-bold">H</div>
              </div>
              <div className="material-symbols-outlined text-4xl text-white/40">arrow_forward</div>
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-4 border-black/20">
                <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
