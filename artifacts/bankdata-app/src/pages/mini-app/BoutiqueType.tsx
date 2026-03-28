import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { ProductCard } from '@/components/ProductCard';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { useListProducts } from '@workspace/api-client-react';
import { COUNTRIES } from '@/lib/countries';

const PRODUCT_TYPES: Record<string, { label: string; emoji: string; color: string; border: string; accent: string; badge: string; description: string; iconBg: string }> = {
  numlist: {
    label: 'NUMLIST',
    emoji: '📱',
    color: 'from-blue-500/20 to-blue-900/5',
    border: 'border-blue-500/20',
    accent: 'text-blue-400',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    iconBg: 'bg-blue-500/15 border-blue-500/25',
    description: 'Listes de numéros vérifiés',
  },
  maillist: {
    label: 'MAILLIST',
    emoji: '📧',
    color: 'from-emerald-500/20 to-emerald-900/5',
    border: 'border-emerald-500/20',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    iconBg: 'bg-emerald-500/15 border-emerald-500/25',
    description: "Bases d'emails opt-in",
  },
  'fiche-client': {
    label: 'FICHE CLIENT',
    emoji: '👤',
    color: 'from-amber-500/20 to-amber-900/5',
    border: 'border-amber-500/20',
    accent: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    iconBg: 'bg-amber-500/15 border-amber-500/25',
    description: 'Fiches clients complètes',
  },
};


export function BoutiqueType({ params }: { params: { type: string } }) {
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ value: string; flag: string; name: string } | null>(null);
  const [allowedCountryValues, setAllowedCountryValues] = useState<string[] | null>(null);

  const typeKey = params.type as keyof typeof PRODUCT_TYPES;
  const typeInfo = PRODUCT_TYPES[typeKey];

  const tagsFilter = selectedCountry ? `${typeKey},${selectedCountry.value}` : undefined;
  const { data: prodData, isLoading } = useListProducts(
    tagsFilter ? { tags: tagsFilter } : {},
    { query: { enabled: !!selectedCountry } },
  );
  const filteredProducts = prodData?.products || [];

  React.useEffect(() => {
    let active = true;
    const loadAllowedCountries = async () => {
      try {
        const res = await fetch(`/api/rubriques/${typeKey}/countries`);
        const data = await res.json();
        if (!active) return;
        if (res.ok && Array.isArray(data?.countries)) {
          setAllowedCountryValues(data.countries);
          return;
        }
      } catch {
      }
      if (active) setAllowedCountryValues([]);
    };

    if (typeInfo) loadAllowedCountries();
    return () => {
      active = false;
    };
  }, [typeKey, typeInfo]);

  const filteredCountries = COUNTRIES.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const isAllowed = !allowedCountryValues || allowedCountryValues.length === 0 || allowedCountryValues.includes(c.value);
    return matchesSearch && isAllowed;
  });

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
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/[0.04] px-5 py-3 flex items-center gap-3">
        {selectedCountry ? (
          <button
            onClick={() => setSelectedCountry(null)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <Link href="/">
            <button className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 mb-0.5 ${typeInfo.badge}`}>
            <span>{typeInfo.emoji}</span> {typeInfo.label}
          </div>
          <h1 className="text-sm font-black text-white leading-none truncate">
            {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : typeInfo.description}
          </h1>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!selectedCountry && (
          <motion.main
            key="countries"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            className="p-5 space-y-4"
          >
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${typeInfo.color} border ${typeInfo.border} relative overflow-hidden`}>
              <div className="absolute inset-0 shimmer-gold opacity-30" />
              <div className="relative flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${typeInfo.iconBg} border flex items-center justify-center flex-shrink-0`}>
                  <span className="text-3xl">{typeInfo.emoji}</span>
                </div>
                <div>
                  <h2 className={`text-xl font-black ${typeInfo.accent}`}>{typeInfo.label}</h2>
                  <p className="text-xs text-white/35 mt-0.5">Sélectionnez un pays</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/15 transition-colors"
              />
            </div>

            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2.5">
                {filteredCountries.length} pays
              </p>
              <div className="flex flex-col gap-1.5">
                {filteredCountries.map((country, i) => (
                  <motion.button
                    key={country.value}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    onClick={() => setSelectedCountry(country)}
                    className="glass-card-hover px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-left group active:scale-[0.99] w-full"
                  >
                    <span className="text-xl flex-shrink-0">{country.flag}</span>
                    <p className="font-semibold text-white/80 text-sm flex-1">{country.name}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 flex-shrink-0 transition-colors" />
                  </motion.button>
                ))}
              </div>

              {filteredCountries.length === 0 && (
                <div className="py-12 text-center text-white/30">
                  <p className="text-3xl mb-2">🌍</p>
                  <p className="text-sm">Aucun pays trouvé</p>
                </div>
              )}
            </div>
          </motion.main>
        )}

        {selectedCountry && (
          <motion.main
            key="products"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="p-5"
          >
            <p className="text-xs text-white/30 mb-4">
              {isLoading ? '...' : `${filteredProducts.length} produit${filteredProducts.length !== 1 ? 's' : ''} disponible${filteredProducts.length !== 1 ? 's' : ''}`}
            </p>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-56 bg-white/[0.03] animate-pulse rounded-2xl border border-white/[0.04]" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="text-5xl mb-3 opacity-60">{typeInfo.emoji}</div>
                <h3 className="text-base font-bold text-white mb-1">Aucun produit</h3>
                <p className="text-white/30 text-xs max-w-[200px] mb-5">
                  Pas de {typeInfo.label} pour {selectedCountry.name} actuellement.
                </p>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="btn-secondary text-xs px-4 py-2"
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
