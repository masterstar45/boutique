import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGetAffiliateStats } from '@workspace/api-client-react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { formatMoney } from '@/lib/utils';
import { UserCircle, LogOut, Wallet, ShieldAlert, Copy, X, Loader2, CheckCircle2, Clock, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const PRESET_AMOUNTS = ['10', '25', '50', '100', '200', '500'];

type DepositState =
  | { step: 'form' }
  | { step: 'loading' }
  | { step: 'paying'; deposit: any }
  | { step: 'polling'; deposit: any }
  | { step: 'confirmed'; deposit: any };

export function Profile() {
  const { user, logout, isAdmin, refreshUser } = useAuth();
  const { data: affiliate } = useGetAffiliateStats();
  const { toast } = useToast();

  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState('25');
  const [depositState, setDepositState] = useState<DepositState>({ step: 'form' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPolling();
  }, []);

  const openModal = () => {
    setAmount('25');
    setDepositState({ step: 'form' });
    setShowDeposit(true);
  };

  const closeModal = () => {
    clearPolling();
    setShowDeposit(false);
    setDepositState({ step: 'form' });
  };

  const openPayLink = (url: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const parseApiResponse = async (res: Response) => {
    const raw = await res.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(raw || 'Réponse API invalide');
    }
  };

  const handleCreateDeposit = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed < 1) {
      toast({ variant: 'destructive', title: 'Montant invalide', description: 'Minimum 1 €' });
      return;
    }
    setDepositState({ step: 'loading' });
    try {
      const res = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed.toFixed(2) }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (!data?.payLink) throw new Error('Lien de paiement OxaPay introuvable');
      setDepositState({ step: 'paying', deposit: data });
      openPayLink(data.payLink);
      startPolling(data.id);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
      setDepositState({ step: 'form' });
    }
  };

  const startPolling = (depositId: number) => {
    setDepositState(prev => prev.step === 'paying' ? { ...prev, step: 'polling' } : prev);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/deposits/${depositId}/status`);
        const data = await parseApiResponse(res);
        if (!res.ok) return;
        if (data.status === 'confirmed') {
          clearPolling();
          setDepositState({ step: 'confirmed', deposit: data });
          refreshUser?.();
          toast({ title: 'Dépôt confirmé !', description: `Votre solde a été rechargé.` });
        }
      } catch {}
    }, 5000);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({ title: 'Adresse copiée', description: 'Adresse de paiement copiée.' });
  };

  const handleCopyLink = () => {
    if (affiliate?.code) {
      navigator.clipboard.writeText(`https://t.me/bankdata667_bot?start=${affiliate.code}`);
      toast({ title: "Lien copié", description: "Votre lien d'affiliation a été copié." });
    }
  };

  const deposit = depositState.step !== 'form' && depositState.step !== 'loading' ? (depositState as any).deposit : null;

  return (
    <MiniAppLayout>
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-center pt-3 pb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-yellow-600 p-[3px] mb-3 shadow-[0_0_16px_rgba(234,179,8,0.2)]">
            <div className="w-full h-full bg-background rounded-full overflow-hidden flex items-center justify-center border-2 border-background">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-12 h-12 text-white/15" />
              )}
            </div>
          </div>
          <h1 className="text-xl font-black text-white">{user?.firstName} {user?.lastName}</h1>
          <p className="text-white/30 text-xs font-medium">@{user?.username} • ID: {user?.telegramId}</p>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-primary/15 blur-3xl rounded-full" />
          <p className="text-xs font-bold text-white/40 mb-0.5 relative z-10 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Solde Principal
          </p>
          <h2 className="text-3xl font-black text-gradient-gold relative z-10 mb-3">
            {formatMoney(user?.balance || 0)}
          </h2>
          <button
            onClick={openModal}
            className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm rounded-xl border border-primary/20 transition-colors relative z-10 flex items-center justify-center gap-2"
          >
            <Wallet className="w-3.5 h-3.5" /> Recharger
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-3">
          <h3 className="font-bold text-white text-sm">Affiliation</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <p className="text-[10px] text-white/25 mb-0.5">Référés</p>
              <p className="text-base font-bold text-white">{affiliate?.totalReferrals || 0}</p>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <p className="text-[10px] text-white/25 mb-0.5">Gains</p>
              <p className="text-base font-bold text-primary">{formatMoney(affiliate?.totalEarnings || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04] text-[10px] font-mono text-white/30 truncate">
              https://t.me/bankdata667_bot?start={affiliate?.code || 'XXX'}
            </div>
            <button onClick={handleCopyLink} className="p-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 border border-primary/15 transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {isAdmin && (
            <Link href="/admin" className="w-full p-3.5 glass-card rounded-xl flex items-center gap-2.5 text-emerald-400 font-bold text-sm hover:bg-emerald-500/[0.06] transition-colors border-emerald-500/15">
              <ShieldAlert className="w-4 h-4" /> Panel Admin
            </Link>
          )}
          <button onClick={logout} className="w-full p-3.5 glass-card rounded-xl flex items-center gap-2.5 text-rose-400 font-bold text-sm hover:bg-rose-500/[0.06] transition-colors border-rose-500/15">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>

      {showDeposit && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg bg-[hsl(240,10%,5%)] border border-white/[0.08] rounded-t-2xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Recharger
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                <X size={16} />
              </button>
            </div>

            {depositState.step === 'form' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/30 block mb-2.5">Montant (€)</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                    {PRESET_AMOUNTS.map(v => (
                      <button
                        key={v}
                        onClick={() => setAmount(v)}
                        className={`py-2 rounded-xl font-bold text-sm transition-colors border ${amount === v ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]'}`}
                      >
                        {v} €
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input-field w-full text-base font-bold"
                    placeholder="Autre montant..."
                  />
                </div>
                <button
                  onClick={handleCreateDeposit}
                  className="w-full btn-primary py-3.5 text-sm"
                >
                  Générer l'adresse de paiement
                </button>
              </div>
            )}

            {depositState.step === 'loading' && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-white/40 text-sm font-medium">Création du paiement...</p>
              </div>
            )}

            {(depositState.step === 'paying' || depositState.step === 'polling') && deposit && (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-3 gap-2.5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/[0.08] border border-primary/20 flex items-center justify-center">
                    <ExternalLink className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-white text-base">Page de paiement ouverte</p>
                    <p className="text-white/30 text-xs mt-0.5">Complétez votre paiement sur OxaPay</p>
                  </div>
                </div>
                <div className="p-3 bg-primary/[0.04] border border-primary/15 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/30">Montant</span>
                    <span className="font-bold text-primary">{parseFloat(deposit.amount).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-yellow-500/[0.06] border border-yellow-500/15 rounded-xl text-yellow-400/70 text-[11px] font-medium">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  En attente — notification Telegram dès réception
                </div>
                {deposit.payLink && (
                  <button
                    onClick={() => openPayLink(deposit.payLink)}
                    className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-sm rounded-xl border border-white/[0.06] transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Rouvrir OxaPay
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-white/20 justify-center">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Vérification automatique...
                </div>
              </div>
            )}

            {depositState.step === 'confirmed' && (
              <div className="flex flex-col items-center py-6 gap-4">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white mb-0.5">Dépôt confirmé !</h3>
                  <p className="text-white/40 text-sm">
                    <span className="text-emerald-400 font-bold">{parseFloat(deposit?.amount || '0').toFixed(2)} €</span> ajoutés à votre solde.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full btn-primary py-3.5 text-sm"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </MiniAppLayout>
  );
}
