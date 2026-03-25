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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setDepositState({ step: 'paying', deposit: data });
      if (data.payLink) openPayLink(data.payLink);
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
        const data = await res.json();
        if (data.status === 'confirmed') {
          clearPolling();
          setDepositState({ step: 'confirmed', deposit: data });
          refreshUser?.();
          toast({ title: '✅ Dépôt confirmé !', description: `Votre solde a été rechargé.` });
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
      navigator.clipboard.writeText(`https://t.me/bankdata_bot?start=${affiliate.code}`);
      toast({ title: "Lien copié", description: "Votre lien d'affiliation a été copié." });
    }
  };

  const deposit = depositState.step !== 'form' && depositState.step !== 'loading' ? (depositState as any).deposit : null;

  return (
    <MiniAppLayout>
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-4 pb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-yellow-600 p-1 mb-4 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
            <div className="w-full h-full bg-card rounded-full overflow-hidden flex items-center justify-center border-2 border-background">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-black text-white">{user?.firstName} {user?.lastName}</h1>
          <p className="text-muted-foreground text-sm font-medium">@{user?.username} • ID: {user?.telegramId}</p>
        </div>

        {/* Balance Card */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
          <p className="text-sm font-bold text-white/70 mb-1 relative z-10 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Solde Principal
          </p>
          <h2 className="text-4xl font-black text-gradient-gold relative z-10 mb-4">
            {formatMoney(user?.balance || 0)}
          </h2>
          <button
            onClick={openModal}
            className="w-full py-3 bg-primary/20 hover:bg-primary/30 text-primary font-bold rounded-xl border border-primary/30 transition-colors relative z-10 flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" /> Recharger mon solde
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>

        {/* Affiliate System */}
        <div className="glass-card p-5 rounded-3xl space-y-4">
          <h3 className="font-bold text-white">Affiliation</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <p className="text-xs text-muted-foreground mb-1">Référés</p>
              <p className="text-lg font-bold text-white">{affiliate?.totalReferrals || 0}</p>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <p className="text-xs text-muted-foreground mb-1">Gains</p>
              <p className="text-lg font-bold text-primary">{formatMoney(affiliate?.totalEarnings || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-black/40 rounded-xl border border-white/5 text-xs font-mono text-white/50 truncate">
              https://t.me/bankdata_bot?start={affiliate?.code || 'XXX'}
            </div>
            <button onClick={handleCopyLink} className="p-3 bg-primary/20 text-primary rounded-xl hover:bg-primary/30">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {isAdmin && (
            <Link href="/admin" className="w-full p-4 glass-card rounded-2xl flex items-center gap-3 text-emerald-400 font-bold hover:bg-emerald-500/10 transition-colors border-emerald-500/20">
              <ShieldAlert className="w-5 h-5" /> Accéder au Panel Admin
            </Link>
          )}
          <button onClick={logout} className="w-full p-4 glass-card rounded-2xl flex items-center gap-3 text-rose-400 font-bold hover:bg-rose-500/10 transition-colors border-rose-500/20">
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </div>
      </div>

      {/* ── DEPOSIT MODAL ── */}
      {showDeposit && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-t-3xl p-6 pb-10 space-y-5 max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" /> Recharger mon solde
              </h2>
              <button onClick={closeModal} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* STEP: Form */}
            {depositState.step === 'form' && (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-3">Montant (€)</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {PRESET_AMOUNTS.map(v => (
                      <button
                        key={v}
                        onClick={() => setAmount(v)}
                        className={`py-2.5 rounded-xl font-bold text-sm transition-colors border ${amount === v ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
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
                    className="input-field w-full text-lg font-bold"
                    placeholder="Autre montant..."
                  />
                </div>
                <button
                  onClick={handleCreateDeposit}
                  className="w-full py-4 bg-primary text-black font-black rounded-2xl hover:bg-primary/90 transition-colors"
                >
                  Générer l'adresse de paiement →
                </button>
              </div>
            )}

            {/* STEP: Loading */}
            {depositState.step === 'loading' && (
              <div className="flex flex-col items-center py-10 gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-white/60 font-medium">Création du paiement...</p>
              </div>
            )}

            {/* STEP: Paying / Polling */}
            {(depositState.step === 'paying' || depositState.step === 'polling') && deposit && (
              <div className="space-y-5">
                <div className="flex flex-col items-center py-4 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-white text-lg">Page de paiement ouverte</p>
                    <p className="text-muted-foreground text-sm mt-1">Complétez votre paiement sur OxaPay</p>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold text-primary">{parseFloat(deposit.amount).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs font-medium">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  En attente de confirmation — vous recevrez un message Telegram dès que le paiement est reçu
                </div>
                {deposit.payLink && (
                  <button
                    onClick={() => openPayLink(deposit.payLink)}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Rouvrir la page OxaPay
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Vérification automatique toutes les 5 secondes...
                </div>
              </div>
            )}

            {/* STEP: Confirmed */}
            {depositState.step === 'confirmed' && (
              <div className="flex flex-col items-center py-8 gap-5">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-white mb-1">Dépôt confirmé !</h3>
                  <p className="text-muted-foreground text-sm">
                    <span className="text-emerald-400 font-bold">{parseFloat(deposit?.amount || '0').toFixed(2)} €</span> ont été ajoutés à votre solde.
                  </p>
                  <p className="text-muted-foreground text-xs mt-2">Un message Telegram de confirmation vous a été envoyé.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-4 bg-primary text-black font-black rounded-2xl hover:bg-primary/90 transition-colors"
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
