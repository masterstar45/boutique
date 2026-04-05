import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BotVerification } from "@/components/BotVerification";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

// Mini App Pages
import { Splash } from "@/pages/mini-app/Splash";
import { Home } from "@/pages/mini-app/Home";
import { BoutiqueType } from "@/pages/mini-app/BoutiqueType";
import { ProductDetail } from "@/pages/mini-app/ProductDetail";
import { Cart } from "@/pages/mini-app/Cart";
import { Payment } from "@/pages/mini-app/Payment";
import { Orders } from "@/pages/mini-app/Orders";
import { Profile } from "@/pages/mini-app/Profile";
import { Contact } from "@/pages/mini-app/Contact";

// Admin Pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminProducts } from "@/pages/admin/AdminProducts";
import { AdminOrders } from "@/pages/admin/AdminOrders";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminPromo } from "@/pages/admin/AdminPromo";
import { AdminAdmins } from "@/pages/admin/AdminAdmins";
import { AdminAffiliation } from "@/pages/admin/AdminAffiliation";
import { AdminRubriqueCountries } from "@/pages/admin/AdminRubriqueCountries";
import { AdminBotButtons } from "@/pages/admin/AdminBotButtons";

import NotFound from "@/pages/not-found";

// Global API Interceptor for Bearer Token
const originalFetch = window.fetch;
const envApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.trim() ?? "";

const runtimeFallbackApiBaseUrl =
  typeof window !== "undefined" && window.location.hostname.endsWith("up.railway.app")
    ? "https://api-server-production-823c.up.railway.app"
    : "";

const apiBaseUrl = (envApiBaseUrl || runtimeFallbackApiBaseUrl).replace(/\/+$/, "");

window.fetch = async (input, init) => {
  let nextInput: RequestInfo | URL = input;
  const absoluteApiPrefix = apiBaseUrl ? `${apiBaseUrl}/api` : "";

  if (typeof input === 'string' && input.startsWith('/api') && apiBaseUrl) {
    nextInput = `${apiBaseUrl}${input}`;
  }

  const isRelativeApi = typeof input === 'string' && input.startsWith('/api');
  const isAbsoluteApi = typeof input === 'string' && absoluteApiPrefix !== '' && input.startsWith(absoluteApiPrefix);

  if (isRelativeApi || isAbsoluteApi) {
    const token = localStorage.getItem('bankdata_token');
    if (token) {
      const existing = new Headers(init?.headers);
      existing.set('Authorization', `Bearer ${token}`);
      init = { ...(init || {}), headers: existing };
    }
  }
  return originalFetch(nextInput, init);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }
  }
});

function AdminRoute({ component: Component }: { component: any }) {
  const { isAdmin, isLoading, token, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);

  useEffect(() => {
    if (isLoading || isAdmin || !token || isCheckingAdmin) return;
    let mounted = true;
    setIsCheckingAdmin(true);
    refreshUser()
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsCheckingAdmin(false);
      });
    return () => {
      mounted = false;
    };
  }, [isLoading, isAdmin, token, isCheckingAdmin, refreshUser]);

  useEffect(() => {
    if (!isLoading && !isCheckingAdmin && !isAdmin) {
      setLocation('/');
    }
  }, [isAdmin, isLoading, isCheckingAdmin, setLocation]);

  if (isLoading || isCheckingAdmin || !isAdmin) return <div className="min-h-screen bg-background" />;
  
  return <Component />;
}

function TelegramGate() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center overflow-hidden relative"
      style={{ background: 'hsl(240 10% 4%)' }}
    >
      {/* Gold radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 45% at 50% 40%, rgba(234,179,8,0.10) 0%, transparent 70%),
            radial-gradient(circle at 15% 85%, rgba(234,179,8,0.04) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating ₿ background */}
      {[
        { x: 8, y: 12, s: 28, o: 0.05 }, { x: 85, y: 8, s: 20, o: 0.07 },
        { x: 5, y: 70, s: 36, o: 0.04 }, { x: 90, y: 65, s: 24, o: 0.06 },
        { x: 50, y: 5, s: 18, o: 0.05 }, { x: 50, y: 88, s: 22, o: 0.05 },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute pointer-events-none font-black font-display"
          style={{ left: `${b.x}%`, top: `${b.y}%`, fontSize: b.s, color: '#eab308', opacity: b.o }}
        >
          ₿
        </div>
      ))}

      {/* Corner lines */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2" style={{ borderColor: '#eab30840' }} />
      <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2" style={{ borderColor: '#eab30840' }} />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2" style={{ borderColor: '#eab30840' }} />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2" style={{ borderColor: '#eab30840' }} />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-xs">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl blur-2xl scale-150" style={{ background: 'rgba(234,179,8,0.2)' }} />
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Logo"
            className="relative w-24 h-24 rounded-3xl border"
            style={{ borderColor: '#eab30840', boxShadow: '0 0 30px #eab30850' }}
          />
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: '#090b12' }}
          >
            ₿
          </div>
        </div>

        {/* Title */}
        <div>
          <h1
            className="text-4xl font-black font-display tracking-[0.12em] mb-1"
            style={{
              background: 'linear-gradient(135deg, #fde68a 0%, #eab308 50%, #ca8a04 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 16px #eab30860)',
            }}
          >
            B/\NK$DATA
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-black font-display" style={{ color: '#eab308' }}>₿</span>
            <p className="text-[10px] font-display font-semibold tracking-[0.35em] uppercase" style={{ color: '#eab30870' }}>
              La Boutique Premium
            </p>
            <span className="text-xs font-black font-display" style={{ color: '#eab308' }}>₿</span>
          </div>
        </div>

        <div className="w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(234,179,8,0.3), transparent)' }} />

        <p className="text-xs font-display" style={{ color: '#eab30870' }}>
          Application accessible via Telegram uniquement.
        </p>

        {/* CTA Button */}
        <a
          href="https://t.me/bankdata667_bot"
          className="flex items-center gap-3 px-6 py-3 rounded-xl font-display font-black text-sm w-full justify-center transition-opacity hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #eab308, #ca8a04)',
            color: '#090b12',
            boxShadow: '0 0 25px #eab30850',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Ouvrir via Telegram
        </a>

      </div>
    </div>
  );
}

function MainApp() {
  const [showSplash, setShowSplash] = useState(true);
  const { isLoading, user } = useAuth();

  const shouldShowSplash = showSplash || isLoading;

  if (shouldShowSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  if (!user) {
    return <TelegramGate />;
  }

  return (
    <Switch>
      {/* User Routes */}
      <Route path="/" component={Home} />
      <Route path="/boutique/:type" component={BoutiqueType} />
      <Route path="/produit/:id" component={ProductDetail} />
      <Route path="/panier" component={Cart} />
      <Route path="/paiement/:id" component={Payment} />
      <Route path="/commandes" component={Orders} />
      <Route path="/profil" component={Profile} />
      <Route path="/contact" component={Contact} />

      {/* Admin Routes */}
      <Route path="/admin">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/produits">
        {() => <AdminRoute component={AdminProducts} />}
      </Route>
      <Route path="/admin/commandes">
        {() => <AdminRoute component={AdminOrders} />}
      </Route>
      <Route path="/admin/utilisateurs">
        {() => <AdminRoute component={AdminUsers} />}
      </Route>
      <Route path="/admin/promo-codes">
        {() => <AdminRoute component={AdminPromo} />}
      </Route>
      <Route path="/admin/admins">
        {() => <AdminRoute component={AdminAdmins} />}
      </Route>
      <Route path="/admin/affiliation">
        {() => <AdminRoute component={AdminAffiliation} />}
      </Route>
      <Route path="/admin/rubriques-pays">
        {() => <AdminRoute component={AdminRubriqueCountries} />}
      </Route>
      <Route path="/admin/boutons-bot">
        {() => <AdminRoute component={AdminBotButtons} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function VerificationGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("bankdata_turnstile_verified") === "1";
  });

  if (!isVerified) {
    return (
      <BotVerification
        onVerified={(token) => {
          sessionStorage.setItem("bankdata_turnstile_token", token);
          sessionStorage.setItem("bankdata_turnstile_verified", "1");
          setIsVerified(true);
        }}
        onError={(err) => {
          console.warn("Turnstile verification issue:", err);
        }}
      />
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <VerificationGate>
          <AuthProvider>
            <CartProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <MainApp />
              </WouterRouter>
              <Toaster />
            </CartProvider>
          </AuthProvider>
        </VerificationGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
