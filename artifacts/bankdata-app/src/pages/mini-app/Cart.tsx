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
      <div className="p-5 pb-32">
        <h1 className="text-xl font-display font-black text-white mb-5">Mon Panier</h1>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between glass-card p-3.5 rounded-2xl"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-white/40">Votre solde</p>
                <p className="font-black text-white text-base leading-tight">{formatMoney(balance)}</p>
              </div>
            </div>
            {items.length > 0 && (
              <div className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                hasEnoughBalance
                  ? 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400/80 border border-rose-500/20'
              }`}>
                {hasEnoughBalance ? 'Suffisant' : 'Insuffisant'}
              </div>
            )}
          </motion.div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-3 border border-white/[0.06]">
              <ShoppingCart className="w-8 h-8 text-white/15" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Panier vide</h2>
            <p className="text-white/30 text-sm mb-5">Ajoutez des produits pour commencer.</p>
            <Link href="/" className="btn-primary inline-flex items-center gap-2 text-sm">
              Voir la boutique <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {items.map(item => {
                const optLabel = item.selectedOption?.label;
                const unitPrice = item.selectedOption ? parseFloat(item.selectedOption.price) : parseFloat(item.product.price);
                const records = item.selectedOption ? parseInt(item.selectedOption.quantity, 10) : null;

                return (
                  <div key={`${item.product.id}_${optLabel ?? ''}`} className="glass-card p-3.5 rounded-2xl flex gap-3">
                    <div className="w-16 h-16 bg-white/[0.03] rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.04]">
                      {item.product.imageUrl ? (
                        <img src={resolveImageUrl(item.product.imageUrl)} className="w-full h-full object-cover" alt={item.product.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm line-clamp-1">{item.product.name}</h3>
                          {optLabel && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Package className="w-2.5 h-2.5 text-primary/50" />
                              <span className="text-[10px] text-primary/60 font-semibold">{optLabel}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id, optLabel)}
                          className="text-white/15 hover:text-rose-400 transition-colors p-0.5 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <p className="font-bold text-primary text-sm">{formatMoney(unitPrice)}</p>
                        {!optLabel && (
                          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 text-white/40 hover:text-primary transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 text-white/40 hover:text-primary transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {optLabel && (
                          <span className="text-[10px] text-white/20">Qté : 1</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass-card p-3.5 rounded-2xl flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input
                  type="text"
                  placeholder="Code promo"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={!!activePromo}
                  className="input-field pl-9 h-10 text-sm"
                />
              </div>
              {!activePromo ? (
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoCode || validatePromo.isPending}
                  className="px-4 rounded-xl bg-white/[0.05] font-bold text-sm text-white hover:bg-white/[0.1] transition-colors disabled:opacity-40 border border-white/[0.06]"
                >
                  {validatePromo.isPending ? '...' : 'OK'}
                </button>
              ) : (
                <div className="px-3 flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-400 font-bold text-sm rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h3 className="font-bold text-white text-sm mb-1">Résumé</h3>
              <div className="flex justify-between text-white/50 text-xs">
                <span>Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
                <span>{formatMoney(totalPrice)}</span>
              </div>
              {activePromo && (
                <div className="flex justify-between text-emerald-400/80 text-xs font-medium">
                  <span>Réduction ({activePromo.code})</span>
                  <span>-{formatMoney(activePromo.discountAmount)}</span>
                </div>
              )}
              <div className="h-px w-full bg-white/[0.04]" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">Total</span>
                <span className="font-black text-xl text-gradient-gold">{formatMoney(finalPrice)}</span>
              </div>
              <div className="h-px w-full bg-white/[0.04]" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Après paiement</span>
                <span className={`font-bold ${hasEnoughBalance ? 'text-white/60' : 'text-rose-400/70'}`}>
                  {hasEnoughBalance ? formatMoney(balance - finalPrice) : '—'}
                </span>
              </div>
            </div>

            <AnimatePresence>
              {!hasEnoughBalance && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 p-3.5 bg-rose-500/[0.06] border border-rose-500/15 rounded-xl text-rose-400/80"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">Solde insuffisant</p>
                    <p className="text-[10px] mt-0.5 text-rose-400/50">
                      Il manque <strong>{formatMoney(finalPrice - balance)}</strong>. Rechargez depuis votre profil.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleCheckout}
              disabled={isProcessing || !hasEnoughBalance}
              className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
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
