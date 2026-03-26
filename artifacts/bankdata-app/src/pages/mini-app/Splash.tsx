import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const floatingBtc = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 5 + (i * 8.5) % 90,
  y: 5 + (i * 13) % 85,
  size: 14 + (i % 4) * 8,
  delay: (i * 0.4) % 3,
  duration: 3 + (i % 3),
  opacity: 0.06 + (i % 3) * 0.04,
}));

function GlitchTitle() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const loop = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
      setTimeout(loop, 2200 + Math.random() * 1500);
    };
    const t = setTimeout(loop, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative select-none">
      <h1
        className="text-5xl font-black font-display tracking-[0.12em]"
        style={{
          background: 'linear-gradient(135deg, #fde68a 0%, #eab308 40%, #ca8a04 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: glitch
            ? 'drop-shadow(2px 0 0 #eab308) drop-shadow(-2px 0 0 #fde68a)'
            : 'drop-shadow(0 0 24px #eab30870)',
          transform: glitch ? 'translateX(2px)' : 'none',
          transition: 'transform 0.05s',
        }}
      >
        B/\NK$DATA
      </h1>
      {glitch && (
        <h1
          className="absolute inset-0 text-5xl font-black font-display tracking-[0.12em]"
          style={{
            background: 'linear-gradient(135deg, #eab308, #ca8a04)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            transform: 'translateX(-3px)',
            opacity: 0.4,
          }}
        >
          B/\NK$DATA
        </h1>
      )}
    </div>
  );
}

function getTelegramUser(): { username?: string; firstName?: string } {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      try {
        sessionStorage.setItem('bankdata_tg_user', JSON.stringify(tg.initDataUnsafe.user));
      } catch {}
      return {
        username: tg.initDataUnsafe.user.username,
        firstName: tg.initDataUnsafe.user.first_name,
      };
    }
  } catch {}
  return {};
}

export function Splash({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const tgUser = getTelegramUser();
  const displayName = tgUser.username
    ? `@${tgUser.username}`
    : tgUser.firstName || null;

  useEffect(() => {
    const start = Date.now();
    const duration = 3000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(p);
      if (p >= 50 && !showWelcome) setShowWelcome(true);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 300);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'hsl(240 10% 4%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 38%, rgba(234,179,8,0.13) 0%, transparent 70%),
            radial-gradient(circle at 15% 80%, rgba(234,179,8,0.04) 0%, transparent 40%),
            radial-gradient(circle at 85% 20%, rgba(234,179,8,0.04) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating ₿ */}
      {floatingBtc.map((b) => (
        <motion.div
          key={b.id}
          className="absolute pointer-events-none font-black font-display"
          style={{ left: `${b.x}%`, top: `${b.y}%`, fontSize: b.size, color: '#eab308', opacity: b.opacity }}
          animate={{ y: [0, -20, 0], opacity: [b.opacity, b.opacity * 2.8, b.opacity] }}
          transition={{ delay: b.delay, duration: b.duration, repeat: Infinity, ease: 'easeInOut' }}
        >
          ₿
        </motion.div>
      ))}

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2" style={{ borderColor: '#eab30840' }} />
      <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2" style={{ borderColor: '#eab30840' }} />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2" style={{ borderColor: '#eab30840' }} />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2" style={{ borderColor: '#eab30840' }} />
      <span className="absolute top-3 left-3 text-xs font-black" style={{ color: '#eab30840' }}>₿</span>
      <span className="absolute top-3 right-3 text-xs font-black" style={{ color: '#eab30840' }}>₿</span>
      <span className="absolute bottom-3 left-3 text-xs font-black" style={{ color: '#eab30840' }}>₿</span>
      <span className="absolute bottom-3 right-3 text-xs font-black" style={{ color: '#eab30840' }}>₿</span>

      <div className="relative z-10 flex flex-col items-center w-full px-8">

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="relative mb-5"
        >
          <motion.div
            animate={{ boxShadow: ['0 0 25px #eab30855', '0 0 55px #eab30890', '0 0 25px #eab30855'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="rounded-3xl overflow-hidden border"
            style={{ borderColor: '#eab30845' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Logo"
              className="w-28 h-28 object-cover"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.18) 0%, transparent 60%)' }} />
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center font-black text-base"
            style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: '#090b12', boxShadow: '0 0 14px #eab30880' }}
          >
            ₿
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-1"
        >
          <GlitchTitle />
        </motion.div>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="flex items-center gap-2 mb-7"
        >
          <span className="text-sm font-black" style={{ color: '#eab308' }}>₿</span>
          <p className="text-[10px] font-display font-semibold tracking-[0.35em] uppercase" style={{ color: '#eab30875' }}>
            La Boutique Premium
          </p>
          <span className="text-sm font-black" style={{ color: '#eab308' }}>₿</span>
        </motion.div>

        {/* Welcome message */}
        <AnimatePresence>
          {displayName && showWelcome && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 180 }}
              className="mb-6 px-5 py-3 rounded-2xl flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(234,179,8,0.06))',
                border: '1px solid rgba(234,179,8,0.3)',
                boxShadow: '0 0 24px rgba(234,179,8,0.12)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: '#090b12' }}
              >
                ₿
              </div>
              <div>
                <div className="text-[9px] font-display tracking-[0.25em] uppercase mb-0.5" style={{ color: '#eab30860' }}>
                  Bienvenue
                </div>
                <div
                  className="text-base font-black font-display tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, #fde68a, #eab308)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 8px #eab30860)',
                  }}
                >
                  {displayName}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="w-full max-w-[220px]"
        >
          <div className="flex justify-between mb-1.5">
            <span className="text-[9px] font-display tracking-widest uppercase" style={{ color: '#eab30855' }}>
              Chargement
            </span>
            <span className="text-[9px] font-display font-bold" style={{ color: '#eab308' }}>
              {progress}%
            </span>
          </div>
          <div
            className="h-[3px] w-full rounded-full overflow-hidden"
            style={{ background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.18)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #ca8a04, #eab308, #fde68a)',
                boxShadow: '0 0 10px #eab30890',
              }}
            />
          </div>
        </motion.div>

        {/* Status text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0.4, 0.6] }}
          transition={{ delay: 1, duration: 1.2 }}
          className="mt-3 text-[8px] font-display tracking-[0.25em] uppercase"
          style={{ color: '#eab30845' }}
        >
          {progress < 40 ? '▸ Connexion sécurisée...' : progress < 80 ? '▸ Chargement boutique...' : '▸ Presque prêt...'}
        </motion.p>
      </div>
    </div>
  );
}
