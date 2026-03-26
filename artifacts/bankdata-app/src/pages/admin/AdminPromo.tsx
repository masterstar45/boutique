import React, { useState } from 'react';
import { useAdminListPromoCodes, useAdminCreatePromoCode } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Plus, X, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminPromo() {
  const { data, isLoading } = useAdminListPromoCodes();
  const promos = data?.promoCodes || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMut = useAdminCreatePromoCode();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: '', discountType: 'percent', discountValue: '', maxUses: '', minOrderAmount: '0', isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ 
        data: {
          ...form,
          maxUses: form.maxUses ? parseInt(form.maxUses, 10) : undefined
        } 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promo-codes'] });
      setIsModalOpen(false);
      toast({ title: "Créé", description: "Code promo ajouté avec succès." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white">Codes Promo</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez les réductions et offres.</p>
        </div>
        <button onClick={() => { setForm({code: '', discountType: 'percent', discountValue: '', maxUses: '', minOrderAmount: '0', isActive: true}); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Créer
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] text-white/40 uppercase tracking-wider">
              <th className="px-4 sm:px-5 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Réduction</th>
              <th className="px-4 py-3 font-semibold">Utilisations</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold text-right">Création</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
            ) : promos.map(promo => (
              <tr key={promo.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-bold text-white font-mono">{promo.code}</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-emerald-400">
                  {promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${formatMoney(promo.discountValue)}`}
                </td>
                <td className="p-4 text-white">
                  {promo.currentUses} {promo.maxUses ? `/ ${promo.maxUses}` : '(Illimité)'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-bold ${promo.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {promo.isActive ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="p-4 text-right text-muted-foreground text-sm">
                  {formatDate(promo.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="glass-card w-full max-w-md bg-card rounded-3xl relative z-10 border border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-card/90">
              <h2 className="text-xl font-bold text-white">Nouveau Code Promo</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-2">Code (ex: SUMMER24)</label>
                <input required value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="input-field font-mono uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Type</label>
                  <select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="input-field appearance-none">
                    <option value="percent">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Valeur</label>
                  <input required type="number" step="0.01" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Max utilisations (vide = ∞)</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm({...form, maxUses: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Achat Minimum (€)</label>
                  <input type="number" step="0.01" value={form.minOrderAmount} onChange={e => setForm({...form, minOrderAmount: e.target.value})} className="input-field" />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={createMut.isPending} className="btn-primary w-full py-4 text-lg">
                  {createMut.isPending ? 'Création...' : 'Créer le code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
