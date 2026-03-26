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
        whileHover={{ y: -5 }}
        className="glass-card rounded-2xl overflow-hidden h-full flex flex-col relative"
      >
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {product.isFeatured && (
            <div className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1 border border-primary/30">
              <Star className="w-3 h-3 fill-primary" /> PREMIUM
            </div>
          )}
          {product.isNew && (
            <div className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1 border border-blue-500/30">
              <Sparkles className="w-3 h-3" /> NOUVEAU
            </div>
          )}
          {product.isBestSeller && (
            <div className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md flex items-center gap-1 border border-rose-500/30">
              <TrendingUp className="w-3 h-3" /> BEST SELLER
            </div>
          )}
        </div>

        {/* Image / Icon */}
        <div className="h-40 w-full bg-gradient-to-br from-white/5 to-transparent relative flex items-center justify-center border-b border-white/5 overflow-hidden">
          {product.imageUrl ? (
            <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="text-6xl group-hover:scale-110 transition-transform duration-500">
              📦
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-white leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
            {product.description}
          </p>
          
          {/* Stock disponible */}
          {(product.stock ?? 0) > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-white/40">Stock disponible</span>
                <span className={`font-bold ${(product.stockAvailable ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(product.stockAvailable ?? 0).toLocaleString('fr-FR')} enr.
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, ((product.stockAvailable ?? 0) / (product.stock ?? 1)) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between">
            <span className="text-lg font-black text-gradient-gold">
              {formatMoney(product.price)}
            </span>
            <button
              onClick={handleAdd}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary flex items-center justify-center border border-white/10 hover:border-primary/50 transition-all active:scale-95"
              title={hasOptions ? 'Choisir une option' : 'Ajouter au panier'}
            >
              {hasOptions ? <ChevronRight className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
