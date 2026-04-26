import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { Skeleton, AreaTooltip, PieTooltip, CHART_COLORS } from './ui';

/**
 * AnalyticsSection — Spending history area chart + Category breakdown pie chart.
 */
const AnalyticsSection = ({ spendingHistory, historyLoading, categoryBreakdown, categoryLoading }) => (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending History: Area Chart */}
        <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-xl font-bold tracking-tight mb-1">Spending Analytics</h2>
                    <p className="text-on-surface-variant text-sm">Monthly trend — last 6 months</p>
                </div>
            </div>
            {historyLoading ? (
                <Skeleton className="h-64 w-full" />
            ) : (
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={spendingHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0058bb" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#0058bb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#595c5e' }}
                            tickFormatter={(v) => v.split(' ')[0]} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#595c5e' }} tickFormatter={v => `$${v}`}
                            axisLine={false} tickLine={false} width={52} />
                        <Tooltip content={<AreaTooltip />} />
                        <Area type="monotone" dataKey="spend" stroke="#0058bb" strokeWidth={2.5}
                            fill="url(#areaGrad)" dot={{ fill: '#0058bb', r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: '#0058bb', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>

        {/* Category Breakdown: Pie Chart */}
        <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight mb-1">Category Breakdown</h2>
                <p className="text-on-surface-variant text-sm">Monthly allocation</p>
            </div>
            {categoryLoading ? (
                <Skeleton className="h-52 w-full" />
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                            <Pie data={categoryBreakdown} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                                paddingAngle={3} strokeWidth={0}>
                                {categoryBreakdown?.map((_, i) => (
                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                        {categoryBreakdown?.slice(0, 4).map((d, i) => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className="font-bold text-on-surface opacity-80">{d.name}</span>
                                </div>
                                <span className="font-black text-on-surface">${d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </section>
);

export default AnalyticsSection;
