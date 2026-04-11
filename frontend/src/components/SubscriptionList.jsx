import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubscriptions, addSubscription, paySubscription, deleteSubscription } from '../lib/api';
import dayjs from 'dayjs';
import { Plus, Check, Loader2, Trash2 } from 'lucide-react';

const SubscriptionList = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    serviceName: '',
    cost: '',
    billingCycle: 'MONTHLY',
    nextBillingDate: dayjs().add(1, 'month').format('YYYY-MM-DD')
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions
  });

  const addMut = useMutation({
    mutationFn: addSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries(['subscriptions']);
      setIsAdding(false);
      setFormData({ serviceName: '', cost: '', billingCycle: 'MONTHLY', nextBillingDate: dayjs().add(1, 'month').format('YYYY-MM-DD') });
    }
  });

  const payMut = useMutation({
    mutationFn: paySubscription,
    onSuccess: () => queryClient.invalidateQueries(['subscriptions'])
  });

  const delMut = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => queryClient.invalidateQueries(['subscriptions'])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.serviceName || !formData.cost) return;
    addMut.mutate({ ...formData, cost: Number(formData.cost) });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Subscriptions</h1>
          <p className="text-textSecondary">Manage services and track billing dates.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={20} /> Add New
        </button>
      </header>

      {isAdding && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end animate-in zoom-in-95 duration-200">
          <div className="col-span-1 lg:col-span-1 border-none sm:border-r border-white/10 lg:pr-4">
             <label className="block text-sm font-medium text-textSecondary mb-1">Service Name</label>
             <input className="input-field" type="text" placeholder="e.g. Netflix" required value={formData.serviceName} onChange={(e) => setFormData({...formData, serviceName: e.target.value})} />
          </div>
          <div className="col-span-1 lg:col-span-1 lg:px-2">
             <label className="block text-sm font-medium text-textSecondary mb-1">Cost ($)</label>
             <input className="input-field" type="number" step="0.01" placeholder="15.99" required value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} />
          </div>
          <div className="col-span-1 lg:col-span-1 lg:px-2">
             <label className="block text-sm font-medium text-textSecondary mb-1">Cycle</label>
             <select className="input-field" value={formData.billingCycle} onChange={(e) => setFormData({...formData, billingCycle: e.target.value})}>
               <option value="WEEKLY">Weekly</option>
               <option value="MONTHLY">Monthly</option>
               <option value="YEARLY">Yearly</option>
             </select>
          </div>
          <div className="col-span-1 lg:col-span-1 lg:px-2">
             <label className="block text-sm font-medium text-textSecondary mb-1">Next Billing Date</label>
             <input className="input-field" type="date" required value={formData.nextBillingDate} onChange={(e) => setFormData({...formData, nextBillingDate: e.target.value})} />
          </div>
          <div className="col-span-1 lg:col-span-1 sm:col-span-2 lg:pl-4">
             <button type="submit" disabled={addMut.isLoading} className="btn-primary w-full h-11">
               {addMut.isLoading ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Save</>}
             </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions?.map((sub) => {
            const daysUntil = dayjs(sub.nextBillingDate).diff(dayjs(), 'day');
            const isRenewingSoon = daysUntil <= 3;
            
            return (
              <div key={sub._id} className={`glass-card p-6 flex flex-col justify-between transition-all hover:scale-[1.02] hover:border-white/20 border-t-4 ${isRenewingSoon ? 'border-t-accent' : 'border-t-primary'}`}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">{sub.serviceName}</h3>
                    <div className="px-2 py-1 bg-surfaceHighlight text-xs rounded-md text-textSecondary font-medium">{sub.billingCycle}</div>
                  </div>
                  <div className="space-y-1 mb-6">
                    <div className="text-2xl font-bold text-white">${sub.cost}</div>
                    <div className="text-sm text-textSecondary">
                      Renews on <span className={isRenewingSoon ? 'text-accent font-semibold' : 'text-white font-medium'}>{dayjs(sub.nextBillingDate).format('MMM DD, YYYY')}</span>
                      ({daysUntil} days left)
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 border-t border-white/5 pt-4">
                  <button 
                    onClick={() => payMut.mutate(sub._id)}
                    disabled={payMut.isLoading}
                    className="flex-1 py-2 bg-surfaceHighlight hover:bg-white/10 text-white rounded-lg font-medium transition-colors text-sm flex justify-center items-center gap-2"
                  >
                     Mark Paid
                  </button>
                  <button 
                    onClick={() => delMut.mutate(sub._id)}
                    className="p-2 bg-surfaceHighlight hover:bg-accent/20 hover:text-accent text-textSecondary rounded-lg transition-colors flex justify-center items-center"
                    title="Cancel Subscription"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {(!subscriptions || subscriptions.length === 0) && !isAdding && (
             <div className="col-span-full py-20 text-center text-textSecondary border border-dashed border-white/10 rounded-2xl">
               No subscriptions found. Click "Add New" to track your first one.
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionList;
