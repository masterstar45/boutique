import React, { useState } from 'react';
import { useAdminListOrders } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { ShoppingBag, ChevronDown, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { value: 'pending', label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'ring-yellow-500/20' },
  { value: 'confirmed', label: 'Confirme', color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
  { value: 'completed', label: 'Termine', color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  { value: 'cancelled', label: 'Annule', color: 'text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
];

export function AdminOrders() {
  const { data, isLoading } = useAdminListOrders();
  const orders = data?.orders || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter(o => {
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchSearch = !search || (o.username || '').toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search);
    return matchStatus && matchSearch;
  });

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise a jour');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: 'Statut mis a jour', description: `Commande #${orderId} → ${newStatus}` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatus = (value: string) => STATUSES.find(s => s.value === value) ?? STATUSES[0];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Commandes</h1>
          <p className="text-white/30 text-sm mt-0.5">Historique et gestion des transactions</p>
        </div>
        <span className="text-sm text-white/30 font-medium">{orders.length} total</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STATUSES.map(s => {
          const count = orders.filter(o => o.status === s.value).length;
          const isSelected = filterStatus === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setFilterStatus(isSelected ? '' : s.value)}
              className={`relative overflow-hidden rounded-xl p-4 text-center transition-all border ${
                isSelected ? `${s.bg} ${s.ring} ring-1 border-transparent` : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
              }`}
            >
              <p className={`text-2xl font-black ${isSelected ? s.color : 'text-white'}`}>{count}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isSelected ? s.color : 'text-white/30'}`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par client ou ID..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>
        {(filterStatus || search) && (
          <button
            onClick={() => { setFilterStatus(''); setSearch(''); }}
            className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Articles</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Montant</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/15 mx-auto" /></td></tr>
              ) : filteredOrders.map(order => {
                const status = getStatus(order.status);
                return (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                    <td className="px-5 py-3.5 text-white/50 font-mono text-xs">#{order.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-white/80 text-sm">{order.username || 'Inconnu'}</div>
                      <div className="text-[10px] text-white/20 font-mono">ID: {order.userId}</div>
                    </td>
                    <td className="px-4 py-3.5 text-white/50 text-sm">{order.itemCount}</td>
                    <td className="px-4 py-3.5 font-bold text-primary text-sm">{formatMoney(order.amount)}</td>
                    <td className="px-4 py-3.5">
                      <div className="relative inline-block">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className={`appearance-none pr-6 pl-2.5 py-1 text-[10px] rounded-md font-bold ring-1 cursor-pointer focus:outline-none ${status.bg} ${status.color} ${status.ring} bg-transparent`}
                        >
                          {STATUSES.map(s => (
                            <option key={s.value} value={s.value} className="bg-[hsl(240,10%,8%)] text-white">{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-white/25 text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-14 text-center">
                    <ShoppingBag className="w-10 h-10 text-white/[0.05] mx-auto mb-3" />
                    <p className="text-sm text-white/20">Aucune commande trouvee</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
