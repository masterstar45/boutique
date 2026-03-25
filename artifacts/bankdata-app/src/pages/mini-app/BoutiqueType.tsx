import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { ProductCard } from '@/components/ProductCard';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { useListProducts } from '@workspace/api-client-react';
import { COUNTRIES } from '@/lib/countries';

const PRODUCT_TYPES: Record<string, { label: string; emoji: string; color: string; border: string; accent: string; badge: string; description: string }> = {
  numlist: {
    label: 'NUMLIST',
    emoji: '📱',
    color: 'from-blue-500/20 to-blue-900/10',
    border: 'border-blue-500/30',
    accent: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Listes de numéros de téléphone vérifiés',
  },
  maillist: {
    label: 'MAILLIST',
    emoji: '📧',
    color: 'from-emerald-500/20 to-emerald-900/10',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: "Bases d'emails opt-in vérifiés",
  },
  'fiche-client': {
    label: 'FICHE CLIENT',
    emoji: '👤',
    color: 'from-amber-500/20 to-amber-900/10',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Fiches clients complètes avec coordonnées',
  },
};


export function BoutiqueType({ params }: { params: { type: string } }) {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ value: string; flag: string; name: string } | null>(null);

  const typeKey = params.type as keyof typeof PRODUCT_TYPES;
  const typeInfo = PRODUCT_TYPES[typeKey];

  const { data: prodData, isLoading } = useListProducts({});
  const allProducts = prodData?.products || [];

  const filteredProducts = useMemo(() => {
    if (!selectedCountry) return [];
    return allProducts.filter(p =>
      Array.isArray(p.tags) &&
      p.tags.some((t: string) => t.toLowerCase() === typeKey) &&
      p.tags.some((t: string) => t.toLowerCase() === selectedCountry.value)
    );
  }, [allProducts, typeKey, selectedCountry]);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!typeInfo) {
    return (
      <MiniAppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
          <p className="text-muted-foreground">Catégorie inconnue</p>
          <Link href="/" className="text-primary font-bold">← Retour</Link>
        </div>
      </MiniAppLayout>
    );
  }

  return (
    <MiniAppLayout>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4">
        {selectedCountry ? (
          <button
            onClick={() => setSelectedCountry(null)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <Link href="/">
            <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
        )}
        <div>
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 mb-1 ${typeInfo.badge}`}>
            <span>{typeInfo.emoji}</span> {typeInfo.label}
          </div>
          <h1 className="text-base font-black text-white leading-none">
            {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : typeInfo.description}
          </h1>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Country picker ── */}
        {!selectedCountry && (
          <motion.main
            key="countries"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 space-y-5"
          >
            {/* Type banner */}
            <div className={`p-5 rounded-2xl bg-gradient-to-br ${typeInfo.color} border ${typeInfo.border}`}>
              <div className="text-5xl mb-3">{typeInfo.emoji}</div>
              <h2 className={`text-2xl font-black ${typeInfo.accent}`}>{typeInfo.label}</h2>
              <p className="text-sm text-white/50 mt-1">Choisissez un pays pour voir les produits disponibles</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Countries grid */}
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">
                {filteredCountries.length} pays
              </p>
              <div className="flex flex-col gap-2">
                {filteredCountries.map((country, i) => (
                  <motion.button
                    key={country.value}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                    onClick={() => setSelectedCountry(country)}
                    className="glass-card px-4 py-3 rounded-xl flex items-center gap-4 text-left group hover:border-white/20 hover:bg-white/10 active:scale-[0.98] transition-all w-full"
                  >
                    <span className="text-2xl flex-shrink-0">{country.flag}</span>
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{country.name}</p>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.badge} flex-shrink-0`}>{typeInfo.label}</div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white flex-shrink-0" />
                  </motion.button>
                ))}
              </div>

              {filteredCountries.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">🌍</p>
                  <p>Aucun pays trouvé</p>
                </div>
              )}
            </div>
          </motion.main>
        )}

        {/* ── STEP 2: Products ── */}
        {selectedCountry && (
          <motion.main
            key="products"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-6"
          >
            <p className="text-sm text-muted-foreground mb-6">
              {isLoading ? '...' : `${filteredProducts.length} produit${filteredProducts.length !== 1 ? 's' : ''} disponible${filteredProducts.length !== 1 ? 's' : ''}`}
            </p>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-64 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="text-6xl mb-4">{typeInfo.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-2">Aucun produit disponible</h3>
                <p className="text-muted-foreground text-sm max-w-xs mb-6">
                  Aucun produit {typeInfo.label} disponible pour {selectedCountry.name} pour l'instant.
                </p>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors"
                >
                  ← Changer de pays
                </button>
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </MiniAppLayout>
  );
}
