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
        <div className="h-[40vh] bg-white/5 animate-pulse" />
        <div className="p-6 space-y-4">
          <div className="h-8 bg-white/5 w-2/3 animate-pulse rounded" />
          <div className="h-6 bg-white/5 w-1/3 animate-pulse rounded" />
          <div className="h-32 bg-white/5 w-full animate-pulse rounded" />
        </div>
      </MiniAppLayout>
    );
  }

  if (error || !product) {
    return (
      <MiniAppLayout>
        <div className="p-6 pt-20 text-center">
          <h2 className="text-xl font-bold text-white mb-4">Produit introuvable</h2>
          <Link href="/" className="btn-secondary inline-flex">Retour à l'accueil</Link>
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
    toast({ title: "✅ Ajouté au panier", description: selectedOption ? `${selectedOption.label}` : product.name, duration: 2000 });
  };

  return (
    <div className="min-h-screen pb-36 relative bg-background">
      {/* Header Image */}
      <div className="relative h-[38vh] w-full bg-gradient-to-b from-black/50 to-background border-b border-white/10 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="text-8xl opacity-50">📦</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        <Link href="/" className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white hover:bg-white/10 transition-colors z-10">
          <ChevronLeft className="w-6 h-6" />
        </Link>
      </div>

      <main className="px-4 relative -mt-10 space-y-4 pb-4">
        {/* Main card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-card p-5 rounded-3xl"
        >
          <div className="flex justify-between items-start gap-4 mb-3">
            <h1 className="text-2xl font-display font-black text-white leading-tight">{product.name}</h1>
            {!hasOptions && (
              <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary font-bold text-xl flex-shrink-0">
                {formatMoney(product.price)}
              </div>
            )}
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {product.tags.map(tag => (
                <span key={tag} className="px-3 py-1 text-xs font-semibold bg-white/5 border border-white/10 rounded-full text-white/70">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-muted-foreground leading-relaxed text-sm">{product.description}</p>

          {/* Stock bar */}
          {stock > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/40 flex items-center gap-1"><Database className="w-3 h-3" /> Stock disponible</span>
                <span className={`font-bold ${stockAvailable > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stockAvailable.toLocaleString('fr-FR')} enregistrements
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, (stockAvailable / stock) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Options de prix */}
        {hasOptions && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5 rounded-3xl"
          >
            <h2 className="text-sm font-black text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" /> Choisissez votre quantité
            </h2>

            <div className="space-y-3">
              {options.map((opt) => {
                const qty = parseInt(opt.quantity, 10) || 0;
                const isSelected = selectedOption?.label === opt.label;
                const outOfStock = stock > 0 && qty > stockAvailable;

                return (
                  <button
                    key={opt.label}
                    onClick={() => !outOfStock && setSelectedOption(isSelected ? null : { label: opt.label, price: opt.price, quantity: opt.quantity })}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 text-left ${
                      outOfStock
                        ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/2'
                        : isSelected
                          ? 'border-primary bg-primary/15 ring-1 ring-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                          : 'border-white/10 bg-white/3 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? 'border-primary bg-primary' : 'border-white/30'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black fill-black" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-white/80'}`}>
                          {opt.label}
                        </p>
                        {qty > 0 && (
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {qty.toLocaleString('fr-FR')} enregistrements
                          </p>
                        )}
                        {outOfStock && (
                          <p className="text-[11px] text-rose-400 mt-0.5">Stock insuffisant</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-right flex-shrink-0 ${isSelected ? 'text-primary' : 'text-white/70'}`}>
                      <p className="text-xl font-black">{formatMoney(opt.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Garantie */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: hasOptions ? 0.2 : 0.1 }}
          className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3 text-primary/80 text-sm font-medium"
        >
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Achat sécurisé. Livraison automatique immédiate après confirmation du paiement crypto.</p>
        </motion.div>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 w-full p-4 glass-panel z-50 border-t border-white/10">
        {selectedOption && (
          <div className="flex items-center justify-between text-sm mb-3 px-1">
            <span className="text-white/50">{selectedOption.label}</span>
            <span className="text-primary font-black text-lg">{formatMoney(selectedOption.price)}</span>
          </div>
        )}
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`w-full btn-primary flex items-center justify-center gap-3 py-4 text-base font-bold transition-all ${
            !canAdd ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          {hasOptions && !selectedOption ? 'Sélectionnez une option' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  );
}
