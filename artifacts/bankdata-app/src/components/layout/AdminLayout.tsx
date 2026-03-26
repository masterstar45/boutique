import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Panel Admin', href: '/admin' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col xl:flex-row">
      {/* Mobile Header */}
      <div className="xl:hidden flex items-center justify-between gap-3 p-4 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-bold text-lg text-gradient-gold">ADMIN</span>
        </div>
        <Link href="/" className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center gap-2">
          Mini App <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Sidebar (Desktop) / Top scroll (Mobile) */}
      <aside className="w-full xl:w-72 xl:min-w-72 glass-panel xl:h-[100dvh] flex-shrink-0 border-b xl:border-b-0 xl:border-r border-border overflow-x-auto xl:overflow-y-auto hide-scrollbar z-40">
        <div className="p-4 xl:p-6 flex flex-col gap-4 xl:gap-8 min-w-0">
          <div className="hidden xl:flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20" />
            <div>
              <h1 className="font-display font-black text-xl tracking-wider text-gradient-gold">B/\NK$DATA</h1>
              <span className="text-[10px] tracking-widest text-primary/70 uppercase font-bold">Admin Panel</span>
            </div>
          </div>

          <nav className="flex flex-wrap xl:flex-col gap-2 min-w-max xl:min-w-0">
            {ADMIN_NAV.map((item) => {
              const isActive = location.startsWith('/admin');
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm xl:text-base whitespace-nowrap",
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

          <div className="hidden xl:block mt-auto space-y-4">
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
      <main className="flex-1 min-w-0 p-4 sm:p-6 xl:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 xl:space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
