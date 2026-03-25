import React, { useState, useMemo } from 'react';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { ProductCard } from '@/components/ProductCard';
import { Search, Filter, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/lib/countries';

const TYPE_META: Record<string, { label: string; emoji: string; accent: string }> = {
  numlist:      { label: 'NUMLIST',      emoji: '📱', accent: 'text-blue-400' },
  maillist:     { label: 'MAILLIST',     emoji: '📧', accent: 'text-emerald-400' },
  'fiche-client': { label: 'FICHE CLIENT', emoji: '👤', accent: 'text-amber-400' },
};

function getUrlParams() {
  if (typeof window === 'undefined') return { type: null, country: null };
  const sp = new URLSearchParams(window.location.search);
  return { type: sp.get('type'), country: sp.get('country') };
}

export function Catalogue() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  const { type: urlType, country: urlCountry } = getUrlParams();

  const { data: catData } = useListCategories();
  const { data: prodData, isLoading } = useListProducts({
    search: search || undefined,
    categoryId: selectedCat || undefined,
  });

  const categories = catData?.categories || [];
  const allProducts = prodData?.products || [];

  const products = useMemo(() => {
    let list = allProducts;

    if (urlType) {
      list = list.filter(p =>
        Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase() === urlType.toLowerCase())
      );
    }

    if (urlCountry) {
      list = list.filter(p =>
        Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase() === urlCountry.toLowerCase())
      );
    }

    return list;
  }, [allProducts, urlType, urlCountry]);

  const typeMeta = urlType ? TYPE_META[urlType] : null;
  const countryFlag = urlCountry ? COUNTRY_FLAGS[urlCountry] : null;
  const countryName = urlCountry ? COUNTRY_NAMES[urlCountry] : null;

  const isFiltered = !!urlType || !!urlCountry;
  const backHref = urlType ? `/boutique/${urlType}` : '/';

  return (
    <MiniAppLayout>
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 pt-4 pb-3 px-6 space-y-3">

        {/* Top bar */}
        <div className="flex items-center gap-3">
          {isFiltered ? (
            <Link href={backHref}>
              <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
          ) : null}

          <div className="flex-1">
            {typeMeta ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-lg font-black ${typeMeta.accent}`}>
                  {typeMeta.emoji} {typeMeta.label}
                </span>
                {countryFlag && countryName && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-bold text-white">
                      {countryFlag} {countryName}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <h1 className="text-2xl font-display font-black text-white">Catalogue</h1>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-10 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-white/30 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-muted-foreground hover:text-white" />
            </button>
          )}
        </div>

        {/* Categories (only show when no type filter active) */}
        {!isFiltered && (
          <div className="flex overflow-x-auto hide-scrollbar gap-2 -mx-6 px-6">
            <button
              onClick={() => setSelectedCat(null)}
              className={cn(
                "px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border",
                selectedCat === null
                  ? "bg-primary text-black border-primary"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:border-white/20"
              )}
            >
              Tous
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border",
                  selectedCat === cat.id
                    ? "bg-primary text-black border-primary"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:text-white hover:border-white/20"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-muted-foreground">
            {isLoading ? '...' : `${products.length} produit${products.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-64 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
            ))
          ) : products.length > 0 ? (
            products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-16 text-center flex flex-col items-center">
              <div className="text-6xl mb-4">
                {typeMeta ? typeMeta.emoji : '🔍'}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                {isFiltered
                  ? `Aucun produit ${typeMeta?.label || ''} disponible pour ${countryName || 'ce pays'} pour l'instant.`
                  : 'Essayez d\'autres mots clés ou catégories.'}
              </p>
              {isFiltered && (
                <Link href={backHref}>
                  <button className="mt-6 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors">
                    ← Changer de pays
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </MiniAppLayout>
  );
}
