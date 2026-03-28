import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { formatMoney } from '@/lib/utils';
import { Wallet, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

function AnimatedLogo() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame: number;
    let offset = 0;
    const animate = () => {
      offset = (offset + 0.5) % 200;
      el.style.backgroundPosition = `${offset}% 50%`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span
      ref={ref}
      className="font-display font-black text-lg tracking-wider"
      style={{
        background: 'linear-gradient(90deg, #ca8a04 0%, #eab308 20%, #fde68a 35%, #fff7aa 50%, #fde68a 65%, #eab308 80%, #ca8a04 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 0 6px rgba(234,179,8,0.5))',
      }}
    >
      B/\NK$DATA
    </span>
  );
}

const CATEGORIES = [
  {
    key: 'numlist',
    label: 'NUMLIST',
    icon: '📱',
    subtitle: 'Bases numéro check',
    gradient: 'from-blue-500/25 via-blue-600/15 to-blue-900/5',
    border: 'border-blue-500/25',
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/20 border-blue-500/30',
    tagColor: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  },
  {
    key: 'maillist',
    label: 'MAILLIST',
    icon: '📧',
    subtitle: 'Bases emails check',
    gradient: 'from-emerald-500/25 via-emerald-600/15 to-emerald-900/5',
    border: 'border-emerald-500/25',
    accent: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    tagColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  },
  {
    key: 'fiche-client',
    label: 'FICHE CLIENT',
    icon: '👤',
    subtitle: 'Fiches complètes',
    gradient: 'from-amber-500/25 via-amber-600/15 to-amber-900/5',
    border: 'border-amber-500/25',
    accent: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    tagColor: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  },
];

export function Home() {
  const { user } = useAuth();

  return (
    <MiniAppLayout>
      <header className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-9 h-9 rounded-xl shadow-[0_0_12px_rgba(234,179,8,0.2)]" />
          <AnimatedLogo />
        </div>
        <Link href="/profil">
          <div className="bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-white/[0.08] transition-colors">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold text-xs text-primary">{formatMoney(user?.balance || 0)}</span>
          </div>
        </Link>
      </header>

      <main className="px-5 pt-5 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-black text-white mb-0.5">
            {user?.username ? (
              <>Salut, <span className="text-primary">@{user.username}</span></>
            ) : (
              <>Bienvenue{user?.firstName ? `, ${user.firstName}` : ''}</>
            )}
          </h2>
          <p className="text-white/35 text-sm">Quelle data cherches-tu ?</p>
        </motion.section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary/60" />
            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.15em]">Nos Rubriques</h3>
          </div>

          <div className="space-y-3">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link href={`/boutique/${cat.key}`}>
                  <div className={`relative w-full p-4 rounded-2xl bg-gradient-to-r ${cat.gradient} border ${cat.border} flex items-center gap-4 group hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 overflow-hidden`}>
                    <div className="absolute inset-0 shimmer-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className={`relative w-14 h-14 rounded-2xl ${cat.iconBg} border flex items-center justify-center flex-shrink-0`}>
                      <span className="text-3xl">{cat.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0 relative">
                      <p className={`text-lg font-black tracking-wide ${cat.accent}`}>
                        {cat.label}
                      </p>
                      <p className="text-[11px] text-white/30 font-medium mt-0.5">
                        {cat.subtitle}
                      </p>
                    </div>

                    <div className="flex-shrink-0 relative flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${cat.tagColor}`}>
                        Choisir pays
                      </span>
                      <ChevronRight className={`w-4 h-4 ${cat.accent} opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

      </main>
    </MiniAppLayout>
  );
}
