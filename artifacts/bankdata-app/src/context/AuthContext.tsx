import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTelegramAuth } from '@workspace/api-client-react';
import type { UserProfile } from '@workspace/api-client-react';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  logout: () => {},
  isAdmin: false,
  refreshUser: async () => {},
});

type TelegramLikeUser = {
  id: number;
  first_name?: string;
  username?: string;
  last_name?: string;
  photo_url?: string;
};

function getCachedTelegramUser(): TelegramLikeUser | null {
  try {
    const raw = sessionStorage.getItem('bankdata_tg_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildProvisionalUser(tgUser: TelegramLikeUser): UserProfile {
  return {
    id: -1,
    telegramId: String(tgUser.id),
    username: tgUser.username,
    firstName: tgUser.first_name ?? 'User',
    lastName: tgUser.last_name,
    photoUrl: tgUser.photo_url,
    balance: '0',
    loyaltyPoints: 0,
    affiliateCode: undefined,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
}

function parseTelegramUserFromInitData(initData: string): TelegramLikeUser | null {
  try {
    const params = new URLSearchParams(initData);
    const rawUser = params.get('user');
    if (!rawUser) return null;
    const user = JSON.parse(rawUser);
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLikelyTelegramWebView(): boolean {
  const ua = navigator.userAgent || "";
  return /Telegram/i.test(ua) || Boolean((window as any).Telegram?.WebApp);
}

async function resolveTelegramContext(): Promise<{ initData: string; tgUser: TelegramLikeUser } | null> {
  const initDataFromQuery = new URLSearchParams(window.location.search).get('tgWebAppData');
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
  const initDataFromHash = hashParams.get('tgWebAppData');
  const initDataFromSession = sessionStorage.getItem('bankdata_tg_init_data');

  // Try for up to 40 attempts × 150ms = 6 seconds total
  for (let attempt = 0; attempt < 40; attempt++) {
    const tg = (window as any).Telegram?.WebApp;
    
    // Try to initialize the WebApp
    if (tg) {
      try {
        if (typeof tg.ready === 'function') {
          tg.ready();
        }
      } catch {}
    }

    // Try to get initData from multiple sources
    const initDataFromSDK = tg?.initData;
    const initData = initDataFromSDK || initDataFromQuery || initDataFromHash || initDataFromSession || '';
    
    // Try to get user from multiple sources
    const userFromSDK = tg?.initDataUnsafe?.user;
    const userFromCache = getCachedTelegramUser();
    const userFromUrl = initData ? parseTelegramUserFromInitData(initData) : null;
    const tgUser = userFromSDK || userFromUrl || userFromCache;

    if (tgUser) {
      if (initData) {
        sessionStorage.setItem('bankdata_tg_init_data', initData);
      }
      return { initData, tgUser };
    }

    await sleep(150); // 150ms between attempts
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bankdata_token'));
  const [isLoading, setIsLoading] = useState(true);

  const telegramAuth = useTelegramAuth();

  useEffect(() => {
    const initAuth = async () => {
      // 1. If Telegram WebApp is available, always authenticate via Telegram
      let telegramContext = await resolveTelegramContext();

      if (!telegramContext) {
        const cachedUser = getCachedTelegramUser();
        if (cachedUser) {
          telegramContext = { initData: '', tgUser: cachedUser };
        }
      }

      if (!telegramContext && isLikelyTelegramWebView()) {
        for (let i = 0; i < 120; i++) {
          telegramContext = await resolveTelegramContext();
          if (telegramContext) {
            break;
          }
          await sleep(250);
        }
      }

      if (telegramContext) {
        const { initData, tgUser } = telegramContext;
        const turnstileToken = sessionStorage.getItem('bankdata_turnstile_token') || '';

        // Keep existing session if present (helps admin panel paths while Telegram auth refreshes)
        const storedUserRaw = localStorage.getItem('bankdata_user');
        const storedToken = localStorage.getItem('bankdata_token');
        if (storedUserRaw && storedToken) {
          try {
            const parsedStoredUser = JSON.parse(storedUserRaw);
            setToken(storedToken);
            setUser(parsedStoredUser);
          } catch {
            const provisionalUser = buildProvisionalUser(tgUser);
            setUser(provisionalUser);
          }
        } else {
          const provisionalUser = buildProvisionalUser(tgUser);
          setUser(provisionalUser);
        }

        try {
          const response = await telegramAuth.mutateAsync({
            data: {
              initData,
              turnstileToken,
              user: {
                id: tgUser.id,
                first_name: tgUser.first_name,
                username: tgUser.username,
                last_name: tgUser.last_name,
                photo_url: tgUser.photo_url
              }
            } as any
          });
          const newToken = response.token;
          const newUser = response.user;
          localStorage.setItem('bankdata_token', newToken);
          localStorage.setItem('bankdata_user', JSON.stringify(newUser));
          setToken(newToken);
          setUser(newUser);
        } catch (err) {
          console.error("Telegram auth failed:", err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 2. Not in Telegram — check for a valid stored token (admin panel use)
      const storedToken = localStorage.getItem('bankdata_token');
      const storedUser = localStorage.getItem('bankdata_user');

      if (storedToken) {
        try {
          const res = await fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const freshUser = await res.json();
            localStorage.setItem('bankdata_user', JSON.stringify(freshUser));
            setToken(storedToken);
            setUser(freshUser);
            setIsLoading(false);
            return;
          } else {
            localStorage.removeItem('bankdata_token');
            localStorage.removeItem('bankdata_user');
          }
        } catch (err) {
          console.error('Token validation failed:', err);
          if (storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsLoading(false);
            return;
          }
        }
      }

      // 3. No Telegram, no valid token — show gate
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('bankdata_token');
    if (!storedToken) return;
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      if (res.ok) {
        const freshUser = await res.json();
        localStorage.setItem('bankdata_user', JSON.stringify(freshUser));
        setUser(freshUser);
      }
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem('bankdata_token');
    localStorage.removeItem('bankdata_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      logout,
      isAdmin: user?.isAdmin ?? false,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
