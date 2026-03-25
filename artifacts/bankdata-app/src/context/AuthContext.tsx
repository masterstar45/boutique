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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bankdata_token'));
  const [isLoading, setIsLoading] = useState(true);

  const telegramAuth = useTelegramAuth();

  useEffect(() => {
    const initAuth = async () => {
      // 1. If Telegram WebApp is available, always authenticate via Telegram
      //    This ensures the real Telegram identity is used, never a cached dev token
      const tg = (window as any).Telegram?.WebApp;

      // Signal to Telegram that the app is ready to be displayed
      if (tg?.ready) tg.ready();

      const initData = tg?.initData;
      const tgUser = tg?.initDataUnsafe?.user;

      if (initData && tgUser) {
        try {
          const response = await telegramAuth.mutateAsync({
            data: {
              initData,
              user: {
                id: tgUser.id,
                first_name: tgUser.first_name,
                username: tgUser.username,
                last_name: tgUser.last_name,
                photo_url: tgUser.photo_url
              }
            }
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
        } catch {
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
