import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, ShieldCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Produits', href: '/admin/produits' },
  { icon: ShoppingBag, label: 'Commandes', href: '/admin/commandes' },
  { icon: Users, label: 'Utilisateurs', href: '/admin/utilisateurs' },
  { icon: Tag, label: 'Promo Codes', href: '/admin/promo-codes' },
  { icon: ShieldCheck, label: 'Admins & Crédits', href: '/admin/admins' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-bold text-lg text-gradient-gold">ADMIN</span>
        </div>
        <Link href="/" className="p-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center gap-2">
          Mini App <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Sidebar (Desktop) / Top scroll (Mobile) */}
      <aside className="w-full md:w-64 glass-panel md:h-screen flex-shrink-0 md:sticky md:top-0 border-b md:border-b-0 md:border-r border-border overflow-x-auto md:overflow-y-auto hide-scrollbar z-40">
        <div className="p-4 md:p-6 flex md:flex-col gap-2 md:gap-8 min-w-max md:min-w-0">
          <div className="hidden md:flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20" />
            <div>
              <h1 className="font-display font-black text-xl tracking-wider text-gradient-gold">B/\NK$DATA</h1>
              <span className="text-[10px] tracking-widest text-primary/70 uppercase font-bold">Admin Panel</span>
            </div>
          </div>

          <nav className="flex md:flex-col gap-2">
            {ADMIN_NAV.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm md:text-base",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden md:block mt-auto space-y-4">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <p className="text-sm font-bold text-white">{user?.username || user?.firstName}</p>
              <p className="text-xs text-muted-foreground">Admin Access</p>
            </div>
            <Link href="/" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-bold">
              <ExternalLink className="w-4 h-4" /> Quitter Admin
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
