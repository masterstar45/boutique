import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BotVerification } from "@/components/BotVerification";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FullScreenLoader } from "@/components/FullScreenLoader";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

// Mini App Pages
import { Splash } from "@/pages/mini-app/Splash";
import { Home } from "@/pages/mini-app/Home";
import { BoutiqueType } from "@/pages/mini-app/BoutiqueType";
import { ProductDetail } from "@/pages/mini-app/ProductDetail";
import { Cart } from "@/pages/mini-app/Cart";
import { Payment } from "@/pages/mini-app/Payment";
import { Profile } from "@/pages/mini-app/Profile";
import { Contact } from "@/pages/mini-app/Contact";

// Admin Pages — lazy-loaded so the storefront bundle stays small
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts").then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders").then(m => ({ default: m.AdminOrders })));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminPromo = lazy(() => import("@/pages/admin/AdminPromo").then(m => ({ default: m.AdminPromo })));
const AdminAdmins = lazy(() => import("@/pages/admin/AdminAdmins").then(m => ({ default: m.AdminAdmins })));
const AdminAffiliation = lazy(() => import("@/pages/admin/AdminAffiliation").then(m => ({ default: m.AdminAffiliation })));
const AdminRubriqueCountries = lazy(() => import("@/pages/admin/AdminRubriqueCountries").then(m => ({ default: m.AdminRubriqueCountries })));
const AdminBotButtons = lazy(() => import("@/pages/admin/AdminBotButtons").then(m => ({ default: m.AdminBotButtons })));

import NotFound from "@/pages/not-found";

const TURNSTILE_MAX_AGE_MS = 4 * 60 * 1000;

function hasFreshTurnstileVerification(): boolean {
  if (typeof window === "undefined") return false;

  const verified = sessionStorage.getItem("bankdata_turnstile_verified") === "1";
  const token = sessionStorage.getItem("bankdata_turnstile_token") || "";
  const verifiedAt = Number(sessionStorage.getItem("bankdata_turnstile_verified_at") || "0");

  if (!verified || !token) return false;
  if (!Number.isFinite(verifiedAt) || verifiedAt <= 0) return false;
  return Date.now() - verifiedAt < TURNSTILE_MAX_AGE_MS;
}

function resetTurnstileVerification(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("bankdata_turnstile_token");
  sessionStorage.removeItem("bankdata_turnstile_verified");
  sessionStorage.removeItem("bankdata_turnstile_verified_at");
}

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
  const { isAdmin, isLoading, token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAdmin && token) {
      setLocation('/');
    }
  }, [isLoading, isAdmin, token, setLocation]);

  if (isLoading || !isAdmin) {
    return <FullScreenLoader />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Component />
    </Suspense>
  );
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
          style={{ left: `${b.x}%`, top: `${b.y}%`, fontSize: b.s, color: 'var(--gold)', opacity: b.o }}
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
            style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#090b12' }}
          >
            ₿
          </div>
        </div>

        {/* Title */}
        <div>
          <h1
            className="text-4xl font-black font-display tracking-[0.12em] mb-1"
            style={{
              background: 'linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 50%, var(--gold-dark) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 16px #eab30860)',
            }}
          >
            B/\NK$DATA
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-black font-display" style={{ color: 'var(--gold)' }}>₿</span>
            <p className="text-[10px] font-display font-semibold tracking-[0.35em] uppercase" style={{ color: '#eab30870' }}>
              La Boutique Premium
            </p>
            <span className="text-xs font-black font-display" style={{ color: 'var(--gold)' }}>₿</span>
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
            background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
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
  const [isVerified, setIsVerified] = useState<boolean>(() => hasFreshTurnstileVerification());

  useEffect(() => {
    const handleReset = () => {
      resetTurnstileVerification();
      setIsVerified(false);
    };

    window.addEventListener("bankdata:turnstile-reset", handleReset);
    return () => window.removeEventListener("bankdata:turnstile-reset", handleReset);
  }, []);

  if (!isVerified) {
    return (
      <BotVerification
        onVerified={(token) => {
          sessionStorage.setItem("bankdata_turnstile_token", token);
          sessionStorage.setItem("bankdata_turnstile_verified", "1");
          sessionStorage.setItem("bankdata_turnstile_verified_at", String(Date.now()));
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
