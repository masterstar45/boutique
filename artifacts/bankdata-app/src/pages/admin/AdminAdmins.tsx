import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, UserPlus, CreditCard, Users, Loader2, CheckCircle2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { formatMoney, formatDate } from '@/lib/utils';

type AdminUser = {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  balance: string;
  createdAt: string;
};

function useAdmins() {
  return useQuery<{ admins: AdminUser[] }>({
    queryKey: ['/api/admin/admins'],
    queryFn: async () => {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch('/api/admin/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur chargement admins');
      return res.json();
    },
  });
}

export function AdminAdmins() {
  const { data, isLoading } = useAdmins();
  const admins = data?.admins || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [promoteId, setPromoteId] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  const [creditTelegramId, setCreditTelegramId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [crediting, setCrediting] = useState(false);
  const [creditResult, setCreditResult] = useState<{ username: string | null; firstName: string; newBalance: string; credited: string } | null>(null);

  const handlePromote = async () => {
    if (!promoteId.trim()) return;
    setPromoting(true);
    try {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch('/api/admin/admins/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telegramId: promoteId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      toast({ title: 'Admin promu', description: `@${data.username || data.telegramId} est maintenant admin.` });
      setPromoteId('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setPromoting(false);
    }
  };

  const handleRevoke = async (userId: number, username: string | null) => {
    if (!confirm(`Retirer les droits admin à @${username || userId} ?`)) return;
    setRevoking(userId);
    try {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch(`/api/admin/admins/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admins'] });
      toast({ title: 'Droits retirés', description: `@${username || userId} n'est plus admin.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setRevoking(null);
    }
  };

  const handleCredit = async () => {
    if (!creditTelegramId.trim() || !creditAmount) return;
    setCrediting(true);
    setCreditResult(null);
    try {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch('/api/admin/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          telegramId: creditTelegramId.trim(),
          amount: parseFloat(creditAmount),
          note: creditNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setCreditResult(data);
      toast({ title: '✅ Crédit effectué', description: `+${parseFloat(data.credited).toFixed(2)} € crédités.` });
      setCreditTelegramId('');
      setCreditAmount('');
      setCreditNote('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setCrediting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white">Admins & Crédits</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérer les accès administrateurs et créditer des clients.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ─── Créditer un client ─── */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Créditer un client</h2>
              <p className="text-xs text-muted-foreground">Ajoute du solde via Telegram ID</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Telegram ID du client</label>
              <input
                type="text"
                value={creditTelegramId}
                onChange={e => { setCreditResult(null); setCreditTelegramId(e.target.value); }}
                placeholder="ex: 5818221358"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Montant (€)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Note (optionnel)</label>
              <input
                type="text"
                value={creditNote}
                onChange={e => setCreditNote(e.target.value)}
                placeholder="ex: Remboursement, Compensation..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
          </div>

          {creditResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  +{parseFloat(creditResult.credited).toFixed(2)} € crédités à {creditResult.firstName}
                  {creditResult.username ? ` (@${creditResult.username})` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Nouveau solde : {formatMoney(creditResult.newBalance)} — Notification Telegram envoyée ✓</p>
              </div>
            </div>
          )}

          <button
            onClick={handleCredit}
            disabled={crediting || !creditTelegramId.trim() || !creditAmount}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold transition-all flex items-center justify-center gap-2"
          >
            {crediting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {crediting ? 'Crédit en cours...' : 'Créditer le solde'}
          </button>
        </div>

        {/* ─── Promouvoir un admin ─── */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Promouvoir un admin</h2>
              <p className="text-xs text-muted-foreground">Donne les droits admin via Telegram ID</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Telegram ID de l'utilisateur</label>
            <input
              type="text"
              value={promoteId}
              onChange={e => setPromoteId(e.target.value)}
              placeholder="ex: 5818221358"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">L'utilisateur doit s'être connecté au moins une fois au mini app.</p>
          </div>

          <button
            onClick={handlePromote}
            disabled={promoting || !promoteId.trim()}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold transition-all flex items-center justify-center gap-2"
          >
            {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {promoting ? 'Promotion...' : 'Promouvoir admin'}
          </button>

          {/* Liste des admins */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-white">Admins actifs ({admins.length})</h3>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : admins.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Aucun admin.</p>
              ) : (
                admins.map(admin => (
                  <div key={admin.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {admin.photoUrl
                          ? <img src={admin.photoUrl} className="w-full h-full object-cover" alt="" />
                          : <ShieldCheck className="w-4 h-4 text-primary" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{admin.firstName}{admin.lastName ? ` ${admin.lastName}` : ''}</div>
                        <div className="text-xs text-primary">@{admin.username || admin.telegramId}</div>
                      </div>
                    </div>
                    {admin.id === currentUser?.id ? (
                      <span className="text-xs text-muted-foreground italic">Vous</span>
                    ) : (
                      <button
                        onClick={() => handleRevoke(admin.id, admin.username)}
                        disabled={revoking === admin.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40"
                        title="Retirer les droits admin"
                      >
                        {revoking === admin.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                        Retirer
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}