import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

export function TelegramGate() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ background: 'hsl(240 10% 4%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 text-center max-w-xs"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(234,179,8,0.12)', border: '1.5px solid rgba(234,179,8,0.25)' }}
        >
          <Send className="w-9 h-9" style={{ color: '#eab308' }} />
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl font-black tracking-wide"
            style={{ color: '#eab308' }}
          >
            BANK$DATA
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Cette boutique est accessible uniquement via le bot Telegram.
          </p>
        </div>

        <a
          href="https://t.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            background: 'linear-gradient(135deg, #ca8a04, #eab308)',
            color: '#000',
          }}
        >
          Ouvrir via Telegram
        </a>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Démarrez le bot et appuyez sur le bouton Boutique
        </p>
      </motion.div>
    </div>
  );
}
