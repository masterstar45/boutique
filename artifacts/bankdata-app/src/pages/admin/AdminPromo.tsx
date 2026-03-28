import React, { useState } from 'react';
import { useAdminListPromoCodes, useAdminCreatePromoCode } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Plus, X, Tag, Loader2 } from 'lucide-react';
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
      toast({ title: "Cree", description: "Code promo ajoute avec succes." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    }
  };

  const activeCount = promos.filter(p => p.isActive).length;

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Codes Promo</h1>
          <p className="text-white/30 text-sm mt-0.5">Gerez les reductions et offres</p>
        </div>
        <button
          onClick={() => { setForm({code: '', discountType: 'percent', discountValue: '', maxUses: '', minOrderAmount: '0', isActive: true}); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Creer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Total codes</p>
          <p className="text-2xl font-black text-white mt-1">{promos.length}</p>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Actifs</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Reduction</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Utilisations</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Creation</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/15 mx-auto" /></td></tr>
              ) : promos.length === 0 ? (
                <tr><td colSpan={5} className="p-14 text-center">
                  <Tag className="w-10 h-10 text-white/[0.05] mx-auto mb-3" />
                  <p className="text-sm text-white/20">Aucun code promo</p>
                </td></tr>
              ) : promos.map(promo => (
                <tr key={promo.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-primary/60" />
                      <span className="font-bold text-white font-mono text-sm">{promo.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-emerald-400 text-sm">
                    {promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${formatMoney(promo.discountValue)}`}
                  </td>
                  <td className="px-4 py-3.5 text-white/60 text-sm">
                    {promo.currentUses} {promo.maxUses ? `/ ${promo.maxUses}` : '(Illimite)'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-md font-bold ring-1 ${
                      promo.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
                    }`}>
                      {promo.isActive ? 'Actif' : 'Desactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-white/25 text-xs">{formatDate(promo.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="w-full max-w-md bg-[hsl(240,10%,7%)] rounded-2xl relative z-10 border border-white/[0.08] shadow-2xl">
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-lg font-black text-white">Nouveau Code Promo</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/30 uppercase tracking-wider block mb-1.5">Code</label>
                <input required value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors" placeholder="SUMMER24" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/30 uppercase tracking-wider block mb-1.5">Type</label>
                  <select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.15] transition-colors appearance-none">
                    <option value="percent">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/30 uppercase tracking-wider block mb-1.5">Valeur</label>
                  <input required type="number" step="0.01" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/30 uppercase tracking-wider block mb-1.5">Max utilisations</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm({...form, maxUses: e.target.value})} placeholder="Illimite" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/30 uppercase tracking-wider block mb-1.5">Achat min</label>
                  <input type="number" step="0.01" value={form.minOrderAmount} onChange={e => setForm({...form, minOrderAmount: e.target.value})} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors" />
                </div>
              </div>
              <button type="submit" disabled={createMut.isPending} className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {createMut.isPending ? 'Creation...' : 'Creer le code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
