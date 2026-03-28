import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, ShieldCheck,
  UserPlus, Globe, Bot, ChevronLeft, ChevronRight, Menu,
  LogOut, Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const NAV_SECTIONS = [
  {
    title: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
      { icon: Package, label: 'Produits', href: '/admin/produits' },
      { icon: ShoppingCart, label: 'Commandes', href: '/admin/commandes' },
    ],
  },
  {
    title: 'Clients',
    items: [
      { icon: Users, label: 'Utilisateurs', href: '/admin/utilisateurs' },
      { icon: Tag, label: 'Codes Promo', href: '/admin/promo-codes' },
      { icon: UserPlus, label: 'Affiliation', href: '/admin/affiliation' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { icon: ShieldCheck, label: 'Admins', href: '/admin/admins' },
      { icon: Globe, label: 'Pays', href: '/admin/rubriques-pays' },
      { icon: Bot, label: 'Bot Telegram', href: '/admin/boutons-bot' },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return location === '/admin';
    return location.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-3 px-1 py-1", collapsed && "justify-center")}>
        <div className="relative">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/30 flex-shrink-0 ring-1 ring-primary/20" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[hsl(240,10%,6%)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-display font-black text-base tracking-wider text-gradient-gold truncate leading-tight">B/\NK$DATA</h1>
            <span className="text-[9px] tracking-[0.25em] text-primary/50 uppercase font-bold">Admin</span>
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent my-4" />

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] px-3 mb-1.5">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[13px] font-medium relative",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                    )}
                    <item.icon className={cn("w-[17px] h-[17px] flex-shrink-0 transition-colors", active ? "text-primary" : "text-white/30 group-hover:text-white/60")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-2 pt-3 border-t border-white/[0.05]">
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06]", collapsed && "p-2")}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-primary">
                {(user?.firstName?.[0] || user?.username?.[0] || 'A').toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.username || user?.firstName}</p>
                <p className="text-[10px] text-emerald-400/70 font-medium flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> En ligne
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/"
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-xs font-medium text-white/40 hover:text-white/70",
            collapsed && "px-2"
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && <span>Quitter</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[hsl(240,10%,4%)] text-foreground flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 xl:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed xl:sticky top-0 left-0 h-[100dvh] z-50 flex flex-col p-3 border-r border-white/[0.05] bg-[hsl(240,10%,5%)] transition-all duration-300",
        collapsed ? "w-[68px]" : "w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Ouvrir" : "Réduire"}
          className="hidden xl:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-[hsl(240,10%,8%)] border border-white/10 items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all z-10 shadow-lg"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="xl:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.05] bg-[hsl(240,10%,4%)]/95 backdrop-blur-xl">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="w-5 h-5 text-white/60" />
          </button>
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-7 h-7 rounded-lg" />
            <span className="font-display font-bold text-sm text-gradient-gold">ADMIN</span>
          </div>
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40">
            <LogOut className="w-4 h-4" />
          </Link>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-5 xl:p-6 overflow-x-hidden bg-[hsl(240,10%,4%)]">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
