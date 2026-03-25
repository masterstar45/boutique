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
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les affiliés' });
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
      toast({ title: 'Taux mis à jour', description: `Nouveau taux : ${parseFloat(data.commissionRate)}%` });
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
      toast({ title: 'Stats recalculées', description: `${data.totalReferrals} référés · ${formatMoney(data.totalEarnings)} gains` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet affilié ? Cette action est irréversible.')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/admin/affiliates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur serveur');
      setAffiliates(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Affilié supprimé' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`https://t.me/bankdata667_bot?start=${code}`);
    toast({ title: 'Lien copié', description: 'Lien de parrainage copié dans le presse-papier' });
  };

  const totalEarnings = affiliates.reduce((sum, a) => sum + parseFloat(a.totalEarnings || '0'), 0);
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.totalReferrals, 0);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gradient-gold">Affiliation</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérer les affiliés et leurs taux de commission</p>
        </div>
        <button
          onClick={fetchAffiliates}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Total affiliés</p>
          <p className="text-2xl font-black text-white">{affiliates.length}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total référés</p>
          <p className="text-2xl font-black text-white">{totalReferrals}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Commissions versées</p>
          <p className="text-2xl font-black text-primary">{formatMoney(totalEarnings)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" /> Chargement...
          </div>
        ) : affiliates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm">Aucun affilié pour le moment.</p>
            <p className="text-xs opacity-60">Les affiliés sont créés automatiquement lors des parrainages.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-4 font-semibold">Utilisateur</th>
                  <th className="text-left px-4 py-4 font-semibold">Code</th>
                  <th className="text-center px-4 py-4 font-semibold">Référés</th>
                  <th className="text-right px-4 py-4 font-semibold">Gains</th>
                  <th className="text-center px-4 py-4 font-semibold">Commission</th>
                  <th className="text-center px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-white">{a.firstName || a.username || `User ${a.userId}`}</p>
                        {a.username && <p className="text-xs text-muted-foreground">@{a.username}</p>}
                        {a.telegramId && <p className="text-xs text-white/30 font-mono">{a.telegramId}</p>}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-primary">
                          {a.code}
                        </span>
                        <button
                          onClick={() => handleCopyLink(a.code)}
                          className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                          title="Copier le lien de parrainage"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Referrals */}
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-white">{a.totalReferrals}</span>
                    </td>

                    {/* Earnings */}
                    <td className="px-4 py-4 text-right">
                      <span className="font-bold text-primary">{formatMoney(a.totalEarnings)}</span>
                    </td>

                    {/* Commission Rate */}
                    <td className="px-4 py-4 text-center">
                      {editingId === a.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={editRate}
                            onChange={e => setEditRate(e.target.value)}
                            className="w-16 text-center bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <button
                            onClick={() => handleSaveCommission(a.id)}
                            disabled={savingId === a.id}
                            className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          >
                            {savingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditCommission(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs font-bold text-white group"
                        >
                          {parseFloat(a.commissionRate).toFixed(1)}%
                          <Pencil className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSync(a.userId)}
                          disabled={syncingId === a.userId}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Recalculer les stats"
                        >
                          {syncingId === a.userId
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RefreshCw className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Supprimer l'affilié"
                        >
                          {deletingId === a.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
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

      {/* Info */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300/80 space-y-1">
        <p className="font-bold text-blue-300">Comment fonctionne le système ?</p>
        <p>• Chaque utilisateur dispose d'un code de parrainage unique, généré à l'inscription.</p>
        <p>• Quand quelqu'un s'inscrit via un lien de parrainage, un affilié est créé automatiquement.</p>
        <p>• À chaque commande complétée, une commission est calculée selon le taux défini ici.</p>
        <p>• Utilisez <strong>Recalculer</strong> pour mettre à jour les stats depuis les données réelles.</p>
      </div>
    </AdminLayout>
  );
}
