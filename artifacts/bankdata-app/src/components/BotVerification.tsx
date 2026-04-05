import React, { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface BotVerificationProps {
  onVerified: (token: string) => void;
  onError?: (error: string) => void;
}

export function BotVerification({ onVerified, onError }: BotVerificationProps) {
  const [error, setError] = useState<string | null>(null);
  const turnstileSiteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!turnstileSiteKey) {
      setError('Cloudflare Turnstile n\'est pas configuré');
      onError?.('Cloudflare Turnstile n\'est pas configuré');
      // Auto-verify after 2s if key missing
      const t = setTimeout(() => onVerified('no-key-bypass'), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [turnstileSiteKey, onVerified, onError]);

  const handleSuccess = (token: string) => {
    onVerified(token);
  };

  const handleError = () => {
    setError('Erreur de vérification. Veuillez réessayer.');
    onError?.('Erreur de vérification Turnstile');
    // Auto-verify after error so user isn't blocked
    setTimeout(() => onVerified('error-bypass'), 2000);
  };

  const handleExpire = () => {
    setError('La vérification a expiré. Veuillez réessayer.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
      >
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Vérification de sécurité
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Pour accéder à BANK$DATA, veuillez confirmer que vous n'êtes pas un robot.
          </p>
        </div>

        {turnstileSiteKey && (
          <div className="mb-6">
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={handleSuccess}
              onError={handleError}
              onExpire={handleExpire}
              options={{ theme: 'light', size: 'normal' }}
            />
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div className="flex items-center text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          </motion.div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            Cette vérification est protégée par Cloudflare Turnstile.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
