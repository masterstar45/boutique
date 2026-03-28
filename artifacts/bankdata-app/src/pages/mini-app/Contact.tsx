import React from 'react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { MessageCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function Contact() {
  return (
    <MiniAppLayout>
      <div className="p-5 space-y-5 pb-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-6 pb-2"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(234,179,8,0.12)]">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Nous contacter</h1>
          <p className="text-white/30 text-sm max-w-xs mx-auto">
            Une question ? Notre équipe répond rapidement sur Telegram.
          </p>
        </motion.div>

        <motion.a
          href="https://t.me/speeed75"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 }}
          className="block"
        >
          <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-yellow-600/10 border border-primary/30 flex items-center gap-3.5 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] active:scale-[0.99] transition-all group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 shimmer-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/20">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-primary" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div className="flex-1 relative">
              <p className="font-black text-white text-base">Contacter sur Telegram</p>
              <p className="text-primary/70 text-xs font-semibold mt-0.5">@speeed75</p>
            </div>
            <div className="flex-shrink-0 relative">
              <div className="px-3 py-1 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-wide">
                Ouvrir
              </div>
            </div>
          </div>
        </motion.a>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="space-y-2"
        >
          {[
            { icon: Zap, color: 'emerald', label: 'Réponse rapide', desc: 'Généralement en moins de quelques heures.' },
            { icon: Clock, color: 'blue', label: 'Disponibilité', desc: 'Support 7j/7 via Telegram.' },
            { icon: ShieldCheck, color: 'primary', label: 'Échanges sécurisés', desc: 'Communications privées et chiffrées.' },
          ].map((item, i) => {
            const colorMap: Record<string, string> = {
              emerald: 'bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-400',
              blue: 'bg-blue-500/[0.06] border-blue-500/15 text-blue-400',
              primary: 'bg-primary/[0.06] border-primary/15 text-primary',
            };
            const iconColors = colorMap[item.color] || colorMap.primary;
            return (
              <div key={i} className="glass-card p-3.5 rounded-xl flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconColors}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{item.label}</p>
                  <p className="text-white/25 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </MiniAppLayout>
  );
}
