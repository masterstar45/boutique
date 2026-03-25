import React, { useState } from 'react';
import { useAdminListOrders } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUSES = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'confirmed', label: 'Confirmé', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'completed', label: 'Terminé', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'cancelled', label: 'Annulé', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
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
      <div className="mb-8">
        <h1 className="text-3xl font-display font-black text-white">Commandes</h1>
        <p className="text-muted-foreground mt-1">Historique et gestion des transactions.</p>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {STATUSES.map(s => {
          const count = orders.filter(o => o.status === s.value).length;
          return (
            <div key={s.value} className={`glass-card p-3 rounded-xl border text-center ${s.color}`}>
              <p className="text-lg font-black">{count}</p>
              <p className="text-[10px] font-bold uppercase">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-sm text-muted-foreground bg-black/20">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Articles</th>
                <th className="p-4 font-semibold">Montant</th>
                <th className="p-4 font-semibold">Statut</th>
                <th className="p-4 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
              ) : orders.map(order => {
                const status = getStatus(order.status);
                return (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-mono">#{order.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-white">{order.username || 'Inconnu'}</div>
                      <div className="text-xs text-muted-foreground">ID: {order.userId}</div>
                    </td>
                    <td className="p-4 text-white">{order.itemCount}</td>
                    <td className="p-4 font-bold text-primary">{formatMoney(order.amount)}</td>
                    <td className="p-4">
                      <div className="relative inline-block">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className={`appearance-none pr-7 pl-3 py-1.5 text-xs rounded-full font-bold border cursor-pointer focus:outline-none ${status.color} bg-transparent`}
                        >
                          {STATUSES.map(s => (
                            <option key={s.value} value={s.value} className="bg-card text-white">{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="p-4 text-right text-muted-foreground text-sm">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucune commande trouvée.</p>
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
