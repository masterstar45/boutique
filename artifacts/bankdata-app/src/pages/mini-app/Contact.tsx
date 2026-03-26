import React from 'react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { MessageCircle, Mail, Clock, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function Contact() {
  return (
    <MiniAppLayout>
      <div className="p-6 space-y-8 pb-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-6 pb-2"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Nous contacter</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Une question ? Un problème ? Notre équipe répond rapidement sur Telegram.
          </p>
        </motion.div>

        {/* Main CTA */}
        <motion.a
          href="https://t.me/speeed75"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="block"
        >
          <div className="w-full p-5 rounded-2xl bg-gradient-to-r from-primary/30 to-yellow-600/20 border border-primary/50 flex items-center gap-4 hover:border-primary/80 hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] active:scale-[0.98] transition-all group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30 group-hover:bg-primary/30 transition-colors">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-primary" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-black text-white text-lg leading-tight">Contacter sur Telegram</p>
              <p className="text-primary text-sm font-semibold mt-0.5">@speeed75</p>
            </div>
            <div className="flex-shrink-0">
              <div className="px-3 py-1.5 rounded-full bg-primary text-black text-xs font-black uppercase tracking-wide">
                Ouvrir
              </div>
            </div>
          </div>
        </motion.a>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 gap-3"
        >
          <div className="glass-card p-4 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Réponse rapide</p>
              <p className="text-muted-foreground text-xs mt-0.5">Nous répondons généralement en moins de quelques heures.</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Disponibilité</p>
              <p className="text-muted-foreground text-xs mt-0.5">Support disponible 7j/7 via Telegram.</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Échanges sécurisés</p>
              <p className="text-muted-foreground text-xs mt-0.5">Toutes nos communications sont privées et chiffrées.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </MiniAppLayout>
  );
}
