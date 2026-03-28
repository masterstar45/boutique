import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import type { ProductSummary } from '@workspace/api-client-react';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';

export function ProductCard({ product }: { product: ProductSummary }) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const hasOptions = (product.priceOptions ?? []).length > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasOptions) {
      setLocation(`/produit/${product.id}`);
      return;
    }
    addToCart(product);
    toast({
      title: "Ajouté au panier",
      description: `${product.name} a été ajouté.`,
      duration: 2000,
    });
  };

  return (
    <Link href={`/produit/${product.id}`} className="block group">
      <motion.div 
        whileHover={{ y: -3 }}
        className="glass-card-hover rounded-2xl overflow-hidden h-full flex flex-col relative"
      >
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.isFeatured && (
            <div className="bg-black/50 text-primary text-[9px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md flex items-center gap-1 border border-primary/20">
              <Star className="w-2.5 h-2.5 fill-primary" /> PREMIUM
            </div>
          )}
          {product.isNew && (
            <div className="bg-black/50 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md flex items-center gap-1 border border-blue-500/20">
              <Sparkles className="w-2.5 h-2.5" /> NOUVEAU
            </div>
          )}
          {product.isBestSeller && (
            <div className="bg-black/50 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md flex items-center gap-1 border border-rose-500/20">
              <TrendingUp className="w-2.5 h-2.5" /> BEST
            </div>
          )}
        </div>

        <div className="h-36 w-full relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent">
          {product.imageUrl ? (
            <>
              <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </>
          ) : (
            <div className="text-5xl opacity-60 group-hover:scale-105 transition-transform duration-500">
              📦
            </div>
          )}
        </div>

        <div className="p-3.5 flex flex-col flex-grow">
          <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 mb-1.5 group-hover:text-primary/90 transition-colors">
            {product.name}
          </h3>
          
          {(product.stock ?? 0) > 0 && (
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span className="text-white/40">Stock</span>
                <span className={`font-bold ${(product.stockAvailable ?? 0) > 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                  {(product.stockAvailable ?? 0).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/80 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, ((product.stockAvailable ?? 0) / (product.stock ?? 1)) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-base font-black text-gradient-gold">
              {formatMoney(product.price)}
            </span>
            <button
              onClick={handleAdd}
              className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/25 text-primary flex items-center justify-center border border-primary/20 hover:border-primary/40 transition-all duration-200 active:scale-90"
              title={hasOptions ? 'Choisir une option' : 'Ajouter au panier'}
            >
              {hasOptions ? <ChevronRight className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
