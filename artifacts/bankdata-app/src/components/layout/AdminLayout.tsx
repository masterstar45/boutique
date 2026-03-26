import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, ShieldCheck,
  UserPlus, Globe, Bot, ExternalLink, ChevronLeft, ChevronRight, Menu, X,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Produits', href: '/admin/produits' },
  { icon: ShoppingCart, label: 'Commandes', href: '/admin/commandes' },
  { icon: Users, label: 'Utilisateurs', href: '/admin/utilisateurs' },
  { icon: Tag, label: 'Codes Promo', href: '/admin/promo-codes' },
  { icon: ShieldCheck, label: 'Admins & Crédits', href: '/admin/admins' },
  { icon: UserPlus, label: 'Affiliation', href: '/admin/affiliation' },
  { icon: Globe, label: 'Pays / Rubriques', href: '/admin/rubriques-pays' },
  { icon: Bot, label: 'Boutons Bot', href: '/admin/boutons-bot' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return location === '/admin';
    return location.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className={cn("flex items-center gap-3 mb-2", collapsed && "justify-center")}>
        <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-9 h-9 rounded-xl shadow-lg shadow-primary/20 flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-display font-black text-lg tracking-wider text-gradient-gold truncate">B/\NK$DATA</h1>
            <span className="text-[9px] tracking-[0.2em] text-primary/60 uppercase font-bold">Admin Panel</span>
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-3" />

      <nav className="flex-1 space-y-1">
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-semibold relative",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(234,179,8,0.2)]"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/90"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", active ? "text-primary" : "text-white/40 group-hover:text-white/70")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-4 border-t border-white/[0.06]">
        <div className={cn("p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]", collapsed && "p-2")}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-primary">
                {(user?.firstName?.[0] || user?.username?.[0] || 'A').toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.username || user?.firstName}</p>
                <p className="text-[10px] text-primary/60 font-semibold">Admin</p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/"
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all text-xs font-bold text-white/60 hover:text-white/90",
            collapsed && "px-2"
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && <span>Quitter Admin</span>}
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed xl:sticky top-0 left-0 h-[100dvh] z-50 flex flex-col p-4 border-r border-white/[0.06] bg-[hsl(240,10%,5%)] transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          className="hidden xl:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-white/10 items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="xl:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] bg-background/90 backdrop-blur-xl">
          <button onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="w-5 h-5 text-white/70" />
          </button>
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-7 h-7 rounded-lg" />
            <span className="font-display font-bold text-sm text-gradient-gold">ADMIN</span>
          </div>
          <Link href="/" aria-label="Retour à la boutique" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <ExternalLink className="w-4 h-4 text-white/50" />
          </Link>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 xl:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
