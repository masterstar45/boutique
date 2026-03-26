import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCreateOrder, useValidatePromo } from '@workspace/api-client-react';
import { useMutation } from '@tanstack/react-query';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import { Trash2, Plus, Minus, Tag, ChevronRight, CheckCircle2, ShoppingCart, Package, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

function usePayWithBalance() {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch('/api/payments/pay-with-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw { data, status: res.status };
      return data as { success: boolean; paymentId: number };
    },
  });
}

export function Cart() {
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<any>(null);

  const validatePromo = useValidatePromo();
  const createOrder = useCreateOrder();
  const payWithBalance = usePayWithBalance();

  const balance = parseFloat(user?.balance ?? '0');

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    try {
      const res = await validatePromo.mutateAsync({ data: { code: promoCode, orderAmount: totalPrice } });
      if (res.valid) {
        setActivePromo({ ...res, code: promoCode });
        toast({ title: "Code appliqué", description: `Réduction de ${res.discountValue} appliquée.` });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: "Code invalide." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message || "Code invalide." });
    }
  };

  const finalPrice = activePromo ? Math.max(0, totalPrice - activePromo.discountAmount) : totalPrice;
  const hasEnoughBalance = balance >= finalPrice;
  const isProcessing = createOrder.isPending || payWithBalance.isPending;

  const handleCheckout = async () => {
    if (items.length === 0 || !hasEnoughBalance) return;
    try {
      const order = await createOrder.mutateAsync({
        data: {
          items: items.map(i => ({
            productId: i.product.id,
            quantity: i.quantity,
            selectedOptionLabel: i.selectedOption?.label,
            recordQuantity: i.selectedOption ? parseInt(i.selectedOption.quantity, 10) : undefined,
          })),
          promoCode: activePromo?.code,
          affiliateCode: localStorage.getItem('bankdata_ref') || undefined
        }
      });

      await payWithBalance.mutateAsync(order.id);

      clearCart();
      await refreshUser();

      toast({ title: "Paiement réussi !", description: "Votre commande a été confirmée." });
      setLocation('/commandes');
    } catch (e: any) {
      const msg = e?.data?.error || e.message || "Une erreur est survenue.";
      toast({ variant: "destructive", title: "Erreur de paiement", description: msg });
    }
  };

  return (
    <MiniAppLayout>
      <div className="p-6 pb-32">
        <h1 className="text-2xl font-display font-black text-white mb-6">Mon Panier</h1>

        {/* Solde disponible */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center justify-between glass-card p-4 rounded-2xl border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Wallet className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Votre solde</p>
                <p className="font-black text-white text-lg leading-tight">{formatMoney(balance)}</p>
              </div>
            </div>
            {items.length > 0 && (
              <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                hasEnoughBalance
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {hasEnoughBalance ? 'Suffisant' : 'Insuffisant'}
              </div>
            )}
          </motion.div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Panier vide</h2>
            <p className="text-muted-foreground mb-6">Ajoutez des produits pour commencer.</p>
            <Link href="/" className="btn-primary inline-flex items-center gap-2">
              Voir la boutique <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {items.map(item => {
                const optLabel = item.selectedOption?.label;
                const unitPrice = item.selectedOption ? parseFloat(item.selectedOption.price) : parseFloat(item.product.price);
                const records = item.selectedOption ? parseInt(item.selectedOption.quantity, 10) : null;

                return (
                  <div key={`${item.product.id}_${optLabel ?? ''}`} className="glass-card p-4 rounded-2xl flex gap-4">
                    <div className="w-20 h-20 bg-black/40 rounded-xl overflow-hidden flex-shrink-0">
                      {item.product.imageUrl ? (
                        <img src={resolveImageUrl(item.product.imageUrl)} className="w-full h-full object-cover" alt={item.product.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-sm line-clamp-2">{item.product.name}</h3>
                          {optLabel && (
                            <div className="flex items-center gap-1 mt-1">
                              <Package className="w-3 h-3 text-primary/70" />
                              <span className="text-[11px] text-primary/80 font-semibold">{optLabel}</span>
                            </div>
                          )}
                          {records && records > 0 && (
                            <p className="text-[10px] text-white/30 mt-0.5">{records.toLocaleString('fr-FR')} enregistrements</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id, optLabel)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-end mt-3">
                        <div>
                          <p className="font-bold text-primary text-sm">{formatMoney(unitPrice)}</p>
                          {item.quantity > 1 && (
                            <p className="text-[10px] text-white/30">= {formatMoney(unitPrice * item.quantity)}</p>
                          )}
                        </div>
                        {!optLabel && (
                          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-1">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 text-white hover:text-primary">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 text-white hover:text-primary">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {optLabel && (
                          <span className="text-xs text-white/30">Qté : 1</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Promo Code */}
            <div className="glass-card p-4 rounded-2xl flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Code promo"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={!!activePromo}
                  className="input-field pl-10 h-12 text-sm"
                />
              </div>
              {!activePromo ? (
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoCode || validatePromo.isPending}
                  className="px-6 rounded-xl bg-white/10 font-bold text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  {validatePromo.isPending ? '...' : 'Appliquer'}
                </button>
              ) : (
                <div className="px-4 flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" /> OK
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="glass-card p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-white mb-2">Résumé</h3>
              <div className="flex justify-between text-muted-foreground text-sm">
                <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
                <span>{formatMoney(totalPrice)}</span>
              </div>
              {activePromo && (
                <div className="flex justify-between text-emerald-400 text-sm font-medium">
                  <span>Réduction ({activePromo.code})</span>
                  <span>-{formatMoney(activePromo.discountAmount)}</span>
                </div>
              )}
              <div className="h-px w-full bg-white/10" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-lg">Total</span>
                <span className="font-black text-2xl text-gradient-gold">{formatMoney(finalPrice)}</span>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Solde après paiement</span>
                <span className={`font-bold ${hasEnoughBalance ? 'text-white' : 'text-rose-400'}`}>
                  {hasEnoughBalance ? formatMoney(balance - finalPrice) : '—'}
                </span>
              </div>
            </div>

            {/* Alerte solde insuffisant */}
            <AnimatePresence>
              {!hasEnoughBalance && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Solde insuffisant</p>
                    <p className="text-xs mt-0.5 text-rose-400/70">
                      Il vous manque <strong>{formatMoney(finalPrice - balance)}</strong>. Rechargez votre solde depuis votre profil.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Checkout */}
            <button
              onClick={handleCheckout}
              disabled={isProcessing || !hasEnoughBalance}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Payer avec mon solde
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </MiniAppLayout>
  );
}
