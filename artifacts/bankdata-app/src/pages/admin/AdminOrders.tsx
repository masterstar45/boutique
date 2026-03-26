import React, { useState } from 'react';
import { useAdminListOrders } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { ShoppingBag, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  { value: 'confirmed', label: 'Confirmé', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { value: 'completed', label: 'Terminé', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { value: 'cancelled', label: 'Annulé', color: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
];

export function AdminOrders() {
  const { data, isLoading } = useAdminListOrders();
  const orders = data?.orders || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: 'Statut mis à jour', description: `Commande #${orderId} → ${newStatus}` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatus = (value: string) => STATUSES.find(s => s.value === value) ?? STATUSES[0];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white">Commandes</h1>
        <p className="text-muted-foreground text-sm mt-1">Historique et gestion des transactions.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STATUSES.map(s => {
          const count = orders.filter(o => o.status === s.value).length;
          return (
            <div key={s.value} className={`glass-card p-3 sm:p-4 rounded-xl border text-center ${s.color}`}>
              <p className="text-xl sm:text-2xl font-black">{count}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-white/40 uppercase tracking-wider">
                <th className="px-4 sm:px-5 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Articles</th>
                <th className="px-4 py-3 font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
              ) : orders.map(order => {
                const status = getStatus(order.status);
                return (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 sm:px-5 py-3.5 text-white/70 font-mono text-xs">#{order.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white text-sm">{order.username || 'Inconnu'}</div>
                      <div className="text-[10px] text-white/30 font-mono">ID: {order.userId}</div>
                    </td>
                    <td className="px-4 py-3.5 text-white/70 text-sm">{order.itemCount}</td>
                    <td className="px-4 py-3.5 font-bold text-primary text-sm">{formatMoney(order.amount)}</td>
                    <td className="px-4 py-3.5">
                      <div className="relative inline-block">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className={`appearance-none pr-6 pl-2.5 py-1 text-[10px] rounded-full font-bold border cursor-pointer focus:outline-none ${status.color} bg-transparent`}
                        >
                          {STATUSES.map(s => (
                            <option key={s.value} value={s.value} className="bg-card text-white">{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-white/30 text-xs">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-white/[0.06] mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Aucune commande trouvée.</p>
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