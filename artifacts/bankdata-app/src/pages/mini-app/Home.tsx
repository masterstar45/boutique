import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { formatMoney } from '@/lib/utils';
import { Wallet, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

function CryptoPunkTitle() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame: number;
    let offset = 0;
    const animate = () => {
      offset = (offset + 0.6) % 200;
      el.style.backgroundPosition = `${offset}% 50%`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative flex items-center select-none">
      <span
        ref={ref}
        className="font-display font-black text-xl tracking-wider"
        style={{
          background: 'linear-gradient(90deg, #ca8a04 0%, #eab308 20%, #fde68a 35%, #fff7aa 50%, #fde68a 65%, #eab308 80%, #ca8a04 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.7)) drop-shadow(0 0 2px rgba(253,230,138,0.5))',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
        }}
      >
        B/\NK$DATA
      </span>
    </div>
  );
}

const PRODUCT_TYPES = [
  {
    key: 'numlist',
    label: 'NUMLIST',
    emoji: '📱',
    description: 'Listes de numéros',
    color: 'from-blue-600/30 to-blue-900/10',
    border: 'border-blue-500/40',
    accent: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  {
    key: 'maillist',
    label: 'MAILLIST',
    emoji: '📧',
    description: 'Bases emails opt-in',
    color: 'from-emerald-600/30 to-emerald-900/10',
    border: 'border-emerald-500/40',
    accent: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  {
    key: 'fiche-client',
    label: 'FICHE CLIENT',
    emoji: '👤',
    description: 'Fiches complètes',
    color: 'from-amber-600/30 to-amber-900/10',
    border: 'border-amber-500/40',
    accent: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
];

export function Home() {
  const { user } = useAuth();

  return (
    <MiniAppLayout>
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 z-40 bg-background/50 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 rounded-xl" />
          <CryptoPunkTitle />
        </div>
        <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-primary">{formatMoney(user?.balance || 0)}</span>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* Welcome */}
        <section>
          <h2 className="text-2xl font-bold mb-1">
            Bienvenue, {user?.username ? <span className="text-primary">@{user.username}</span> : <span>{user?.firstName || 'Visiteur'}</span>} 👋
          </h2>
          <p className="text-muted-foreground text-sm">Quelle data cherches-tu aujourd'hui ?</p>
        </section>

        {/* ═══ 3 MAIN BUTTONS ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">🗂️ Nos Catégories</h3>
          </div>

          <div className="space-y-3">
            {PRODUCT_TYPES.map((type, i) => (
              <motion.div
                key={type.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={`/boutique/${type.key}`}>
                  <button className={`w-full p-5 rounded-2xl bg-gradient-to-r ${type.color} border ${type.border} flex items-center gap-4 group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg ${type.glow} text-left`}>
                    <div className="text-4xl flex-shrink-0">{type.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xl font-black tracking-wide whitespace-nowrap ${type.accent}`}>
                        {type.label}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <div className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${type.border} ${type.accent} bg-black/20`}>
                        Choisir pays
                      </div>
                      <ChevronRight className={`w-5 h-5 ${type.accent} group-hover:translate-x-1 transition-transform`} />
                    </div>
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

      </main>
    </MiniAppLayout>
  );
}
