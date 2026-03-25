import React, { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useCreatePayment, useGetPaymentStatus, useGetOrder } from '@workspace/api-client-react';
import { formatMoney } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Clock, ChevronLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export function Payment() {
  const [, params] = useRoute('/paiement/:id');
  const orderId = parseInt(params?.id || '0', 10);

  const { data: order, isLoading: isOrderLoading } = useGetOrder(orderId);
  const createPayment = useCreatePayment();
  const { toast } = useToast();

  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const openPayLink = (url: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    if (orderId && !paymentId && !createPayment.isPending) {
      createPayment.mutateAsync({ data: { orderId } })
        .then(res => {
          setPaymentId(res.id);
          setPaymentData(res);
          if (res.payLink) openPayLink(res.payLink);
        })
        .catch(() => {
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer le paiement." });
        });
    }
  }, [orderId]);

  const { data: statusData } = useGetPaymentStatus(paymentId || 0, {
    query: {
      enabled: !!paymentId,
      refetchInterval: (query) => {
        const state = query.state.data?.status;
        if (state === 'confirmed' || state === 'expired') return false;
        return 5000;
      }
    }
  });

  const currentStatus = statusData?.status || paymentData?.status || 'pending';

  if (isOrderLoading || !paymentData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Création du paiement OxaPay...</p>
      </div>
    );
  }

  if (currentStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </motion.div>
        <h1 className="text-3xl font-display font-black text-white mb-2">Paiement Validé !</h1>
        <p className="text-muted-foreground mb-8">Votre commande a été traitée avec succès.</p>
        <div className="w-full max-w-sm space-y-4">
          <Link href="/commandes" className="btn-primary w-full flex items-center justify-center gap-2">
            <Download className="w-5 h-5" /> Accéder aux fichiers
          </Link>
          <Link href="/" className="btn-secondary w-full block">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  if (currentStatus === 'expired') {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 border border-rose-500/30">
          <AlertCircle className="w-12 h-12 text-rose-500" />
        </div>
        <h1 className="text-3xl font-display font-black text-white mb-2">Paiement Expiré</h1>
        <p className="text-muted-foreground mb-8">Le délai pour ce paiement est écoulé.</p>
        <Link href="/panier" className="btn-primary">Retour au panier</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 border-b border-white/5">
        <Link href="/panier" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10 hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold text-white">Règlement</h1>
      </header>

      <main className="p-6 max-w-sm mx-auto space-y-6">
        <div className="flex flex-col items-center py-4 gap-3">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.15)]">
            <ExternalLink className="w-10 h-10 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-black text-white text-xl">Page de paiement ouverte</p>
            <p className="text-muted-foreground text-sm mt-1">Complétez votre paiement sur OxaPay</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commande</span>
            <span className="font-bold text-white">#{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-black text-primary text-lg">{formatMoney(order?.amount || 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm font-medium">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span>En attente de confirmation — un message Telegram vous sera envoyé dès réception</span>
        </div>

        {paymentData?.payLink && (
          <button
            onClick={() => openPayLink(paymentData.payLink)}
            className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-2xl border border-primary/30 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" /> Rouvrir la page OxaPay
          </button>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <Loader2 className="w-3 h-3 animate-spin" />
          Vérification automatique toutes les 5 secondes...
        </div>
      </main>
    </div>
  );
}
