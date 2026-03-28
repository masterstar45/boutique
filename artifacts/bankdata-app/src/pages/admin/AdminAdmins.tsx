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
    if (!confirm(`Retirer les droits admin a @${username || userId} ?`)) return;
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
      toast({ title: 'Droits retires', description: `@${username || userId} n'est plus admin.` });
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
      toast({ title: 'Credit effectue', description: `+${parseFloat(data.credited).toFixed(2)} credites.` });
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
        <h1 className="text-2xl font-black text-white tracking-tight">Admins & Credits</h1>
        <p className="text-white/30 text-sm mt-0.5">Gerer les acces administrateurs et crediter des clients</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Crediter un client</h2>
              <p className="text-[11px] text-white/25">Ajouter du solde via Telegram ID</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-1 block">Telegram ID</label>
              <input
                type="text"
                value={creditTelegramId}
                onChange={e => { setCreditResult(null); setCreditTelegramId(e.target.value); }}
                placeholder="ex: 5818221358"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] transition-all font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-1 block">Montant</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-1 block">Note</label>
                <input
                  type="text"
                  value={creditNote}
                  onChange={e => setCreditNote(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {creditResult && (
            <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">
                  +{parseFloat(creditResult.credited).toFixed(2)} credites a {creditResult.firstName}
                  {creditResult.username ? ` (@${creditResult.username})` : ''}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">Nouveau solde : {formatMoney(creditResult.newBalance)}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleCredit}
            disabled={crediting || !creditTelegramId.trim() || !creditAmount}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {crediting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {crediting ? 'En cours...' : 'Crediter'}
          </button>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Promouvoir un admin</h2>
              <p className="text-[11px] text-white/25">Donner les droits via Telegram ID</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-1 block">Telegram ID</label>
            <input
              type="text"
              value={promoteId}
              onChange={e => setPromoteId(e.target.value)}
              placeholder="ex: 5818221358"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] transition-all font-mono text-sm"
            />
            <p className="text-[11px] text-white/20 mt-1.5">L'utilisateur doit s'etre connecte au moins une fois.</p>
          </div>

          <button
            onClick={handlePromote}
            disabled={promoting || !promoteId.trim()}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {promoting ? 'Promotion...' : 'Promouvoir'}
          </button>

          <div className="pt-3 border-t border-white/[0.04]">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-white/25" />
              <h3 className="text-xs font-bold text-white/50">Admins actifs ({admins.length})</h3>
            </div>
            <div className="space-y-1.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                </div>
              ) : admins.length === 0 ? (
                <p className="text-[11px] text-white/20 py-4 text-center">Aucun admin</p>
              ) : (
                admins.map(admin => (
                  <div key={admin.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {admin.photoUrl
                          ? <img src={admin.photoUrl} className="w-full h-full object-cover" alt="" />
                          : <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{admin.firstName}{admin.lastName ? ` ${admin.lastName}` : ''}</div>
                        <div className="text-[10px] text-primary/60">@{admin.username || admin.telegramId}</div>
                      </div>
                    </div>
                    {admin.id === currentUser?.id ? (
                      <span className="text-[10px] text-white/20">Vous</span>
                    ) : (
                      <button
                        onClick={() => handleRevoke(admin.id, admin.username)}
                        disabled={revoking === admin.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-400/70 hover:bg-rose-500/10 transition-all disabled:opacity-30"
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
