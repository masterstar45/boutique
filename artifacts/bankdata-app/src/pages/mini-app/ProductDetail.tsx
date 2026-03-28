import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetProduct } from '@workspace/api-client-react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { useCart, type SelectedOption } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import { ChevronLeft, ShoppingCart, ShieldCheck, Database, CheckCircle2, Package } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProductDetail() {
  const [, params] = useRoute('/produit/:id');
  const id = parseInt(params?.id || '0', 10);

  const { data: product, isLoading, error } = useGetProduct(id);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [selectedOption, setSelectedOption] = useState<SelectedOption | null>(null);

  if (isLoading) {
    return (
      <MiniAppLayout>
        <div className="h-[35vh] bg-white/[0.03] animate-pulse" />
        <div className="p-5 space-y-3">
          <div className="h-7 bg-white/[0.03] w-2/3 animate-pulse rounded-lg" />
          <div className="h-5 bg-white/[0.03] w-1/3 animate-pulse rounded-lg" />
          <div className="h-28 bg-white/[0.03] w-full animate-pulse rounded-lg" />
        </div>
      </MiniAppLayout>
    );
  }

  if (error || !product) {
    return (
      <MiniAppLayout>
        <div className="p-6 pt-20 text-center">
          <h2 className="text-lg font-bold text-white mb-3">Produit introuvable</h2>
          <Link href="/" className="btn-secondary inline-flex text-sm">Retour</Link>
        </div>
      </MiniAppLayout>
    );
  }

  const options = product.priceOptions ?? [];
  const hasOptions = options.length > 0;

  const effectivePrice = selectedOption
    ? parseFloat(selectedOption.price)
    : parseFloat(product.price);

  const effectiveRecords = selectedOption
    ? parseInt(selectedOption.quantity, 10)
    : null;

  const stockAvailable = product.stockAvailable ?? 0;
  const stock = product.stock ?? 0;

  const canAdd = !hasOptions || selectedOption !== null;

  const handleAdd = () => {
    if (hasOptions && !selectedOption) {
      toast({ title: "Choisissez une option", description: "Sélectionnez une quantité avant d'ajouter au panier.", variant: "destructive" });
      return;
    }
    addToCart(product, selectedOption ?? undefined);
    toast({ title: "Ajouté au panier", description: selectedOption ? `${selectedOption.label}` : product.name, duration: 2000 });
  };

  return (
    <MiniAppLayout>
    <div className="min-h-screen pb-8 relative bg-background">
      <div className="relative h-[35vh] w-full flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="text-7xl opacity-40">📦</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />

        <Link href="/" className="absolute top-5 left-5 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/[0.08] text-white hover:bg-white/10 transition-colors z-10">
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      <main className="px-4 relative -mt-8 space-y-3 pb-4">
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-card p-4 rounded-2xl"
        >
          <div className="flex justify-between items-start gap-3 mb-2">
            <h1 className="text-xl font-display font-black text-white leading-tight">{product.name}</h1>
            {!hasOptions && (
              <div className="px-3 py-1.5 bg-primary/10 border border-primary/25 rounded-xl text-primary font-bold text-lg flex-shrink-0">
                {formatMoney(product.price)}
              </div>
            )}
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {product.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-[10px] font-semibold bg-white/[0.04] border border-white/[0.06] rounded-full text-white/50">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-white/50 leading-relaxed text-sm">{product.description}</p>

          {stock > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-white/40 flex items-center gap-1"><Database className="w-3 h-3" /> Stock</span>
                <span className={`font-bold ${stockAvailable > 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                  {stockAvailable.toLocaleString('fr-FR')} enregistrements
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/80 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, (stockAvailable / stock) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {hasOptions && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="glass-card p-4 rounded-2xl"
          >
            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
              <Package className="w-3 h-3" /> Quantité
            </h2>

            <div className="space-y-2">
              {options.map((opt) => {
                const qty = parseInt(opt.quantity, 10) || 0;
                const isSelected = selectedOption?.label === opt.label;
                const outOfStock = stock > 0 && qty > stockAvailable;

                return (
                  <button
                    key={opt.label}
                    onClick={() => !outOfStock && setSelectedOption(isSelected ? null : { label: opt.label, price: opt.price, quantity: opt.quantity })}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 text-left ${
                      outOfStock
                        ? 'opacity-30 cursor-not-allowed border-white/[0.04] bg-white/[0.01]'
                        : isSelected
                          ? 'border-primary/40 bg-primary/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'border-primary bg-primary' : 'border-white/20'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-black fill-black" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-white/70'}`}>
                          {opt.label}
                        </p>
                        {qty > 0 && (
                          <p className="text-[10px] text-white/25 mt-0.5">
                            {qty.toLocaleString('fr-FR')} enregistrements
                          </p>
                        )}
                        {outOfStock && (
                          <p className="text-[10px] text-rose-400/70 mt-0.5">Stock insuffisant</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-right flex-shrink-0 ${isSelected ? 'text-primary' : 'text-white/50'}`}>
                      <p className="text-lg font-black">{formatMoney(opt.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: hasOptions ? 0.16 : 0.08 }}
          className="p-3 rounded-xl bg-primary/[0.04] border border-primary/15 flex gap-2.5 text-primary/60 text-xs font-medium"
        >
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Livraison automatique immédiate après confirmation du paiement.</p>
        </motion.div>
      </main>

      <div className="mt-4 px-4 pb-4">
        {selectedOption && (
          <div className="flex items-center justify-between text-sm mb-2.5 px-0.5">
            <span className="text-white/50 text-xs">{selectedOption.label}</span>
            <span className="text-primary font-black">{formatMoney(selectedOption.price)}</span>
          </div>
        )}
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`w-full btn-primary flex items-center justify-center gap-2.5 py-3.5 text-sm font-bold transition-all ${
            !canAdd ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {hasOptions && !selectedOption ? 'Sélectionnez une option' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
    </MiniAppLayout>
  );
}
