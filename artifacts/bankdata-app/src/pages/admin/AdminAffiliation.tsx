import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney } from '@/lib/utils';
import {
  Users, TrendingUp, DollarSign, RefreshCw, Pencil, Check, X, Trash2, Copy, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AffiliateRow {
  id: number;
  userId: number;
  code: string;
  commissionRate: string;
  totalReferrals: number;
  totalEarnings: string;
  createdAt: string;
  username: string | null;
  firstName: string | null;
  telegramId: string | null;
}

function getToken() {
  return localStorage.getItem('bankdata_token') || '';
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  return res;
}

export function AdminAffiliation() {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAffiliates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/affiliates');
      const data = await res.json();
      setAffiliates(data.affiliates ?? []);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les affilies' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAffiliates(); }, []);

  const handleEditCommission = (a: AffiliateRow) => {
    setEditingId(a.id);
    setEditRate(parseFloat(a.commissionRate).toString());
  };

  const handleSaveCommission = async (id: number) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/admin/affiliates/${id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRate: editRate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAffiliates(prev => prev.map(a => a.id === id ? { ...a, commissionRate: data.commissionRate } : a));
      toast({ title: 'Taux mis a jour', description: `Nouveau taux : ${parseFloat(data.commissionRate)}%` });
      setEditingId(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleSync = async (userId: number) => {
    setSyncingId(userId);
    try {
      const res = await apiFetch(`/api/admin/affiliates/${userId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAffiliates(prev => prev.map(a =>
        a.userId === userId
          ? { ...a, totalReferrals: data.totalReferrals, totalEarnings: data.totalEarnings }
          : a
      ));
      toast({ title: 'Stats recalculees', description: `${data.totalReferrals} referes` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet affilie ? Cette action est irreversible.')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/admin/affiliates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur serveur');
      setAffiliates(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Affilie supprime' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`https://t.me/bankdata667_bot?start=${code}`);
    toast({ title: 'Lien copie', description: 'Lien de parrainage copie dans le presse-papier' });
  };

  const totalEarnings = affiliates.reduce((sum, a) => sum + parseFloat(a.totalEarnings || '0'), 0);
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.totalReferrals, 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Affiliation</h1>
          <p className="text-white/30 text-sm mt-0.5">Gerer les affilies et leurs taux de commission</p>
        </div>
        <button
          onClick={fetchAffiliates}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-xs font-medium text-white/50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 flex items-center gap-3">
          <Users className="w-4 h-4 text-white/20" />
          <div>
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Affilies</p>
            <p className="text-xl font-black text-white">{affiliates.length}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-white/20" />
          <div>
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Referes</p>
            <p className="text-xl font-black text-white">{totalReferrals}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-primary/50" />
          <div>
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Commissions</p>
            <p className="text-xl font-black text-primary">{formatMoney(totalEarnings)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-white/15" />
          </div>
        ) : affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Users className="w-10 h-10 text-white/[0.05]" />
            <p className="text-sm text-white/20">Aucun affilie</p>
            <p className="text-[11px] text-white/10">Les affilies sont crees automatiquement lors des parrainages</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left px-5 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Code</th>
                  <th className="text-center px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Referes</th>
                  <th className="text-right px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Gains</th>
                  <th className="text-center px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Commission</th>
                  <th className="text-center px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-white text-sm">{a.firstName || a.username || `User ${a.userId}`}</p>
                        {a.username && <p className="text-[10px] text-white/25">@{a.username}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-primary">{a.code}</span>
                        <button
                          onClick={() => handleCopyLink(a.code)}
                          className="p-1 rounded hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-white/70">{a.totalReferrals}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-primary">{formatMoney(a.totalEarnings)}</td>
                    <td className="px-4 py-3.5 text-center">
                      {editingId === a.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            className="w-14 text-center bg-black/40 border border-white/15 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:border-primary"
                          />
                          <span className="text-[10px] text-white/25">%</span>
                          <button
                            onClick={() => handleSaveCommission(a.id)}
                            disabled={savingId === a.id}
                            className="p-0.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                          >
                            {savingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-0.5 rounded bg-white/5 text-white/30 hover:bg-white/10 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditCommission(a)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] hover:border-primary/30 transition-colors text-xs font-bold text-white/60 group"
                        >
                          {parseFloat(a.commissionRate).toFixed(1)}%
                          <Pencil className="w-2.5 h-2.5 text-white/20 group-hover:text-primary transition-colors" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSync(a.userId)}
                          disabled={syncingId === a.userId}
                          className="p-1.5 rounded-lg bg-blue-500/8 text-blue-400/60 hover:bg-blue-500/15 transition-colors"
                          title="Recalculer"
                        >
                          {syncingId === a.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="p-1.5 rounded-lg bg-rose-500/8 text-rose-400/60 hover:bg-rose-500/15 transition-colors"
                          title="Supprimer"
                        >
                          {deletingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-blue-300/50 space-y-0.5 mt-4">
        <p className="font-semibold text-blue-300/70 text-xs mb-1">Fonctionnement</p>
        <p>Chaque utilisateur dispose d'un code de parrainage unique, genere a l'inscription.</p>
        <p>A chaque commande completee, une commission est calculee selon le taux defini.</p>
        <p>Utilisez Recalculer pour mettre a jour les stats depuis les donnees reelles.</p>
      </div>
    </AdminLayout>
  );
}
