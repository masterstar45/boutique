import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, ShoppingCart, User, MessageCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: Home, label: 'Accueil', href: '/' },
  { icon: ShoppingCart, label: 'Panier', href: '/panier', badge: true },
  { icon: MessageCircle, label: 'Contact', href: '/contact' },
  { icon: User, label: 'Profil', href: '/profil' },
];

export function MiniAppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { totalItems } = useCart();

  return (
    <div className="min-h-screen pb-28 relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(234,179,8,0.06) 0%, transparent 60%),
            radial-gradient(circle at 0% 100%, rgba(234,179,8,0.03) 0%, transparent 40%),
            radial-gradient(circle at 100% 50%, rgba(234,179,8,0.02) 0%, transparent 40%)
          `
        }} />
      </div>

      {children}

      <nav className="fixed bottom-0 w-full z-50">
        <div className="absolute inset-0 bg-[hsl(240,10%,5%)]/95 backdrop-blur-2xl border-t border-white/[0.06]" />
        <div className="relative flex items-center justify-around max-w-md mx-auto px-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)', paddingTop: '6px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 group relative py-1 px-3">
                <div className={cn(
                  "relative p-2.5 rounded-2xl transition-all duration-300",
                  isActive
                    ? "bg-primary/15 text-primary shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                    : "text-white/30 hover:text-white/50"
                )}>
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  
                  {item.badge && totalItems > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] font-black text-black flex items-center justify-center shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                      {totalItems > 9 ? '9+' : totalItems}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-semibold transition-all duration-300",
                  isActive ? "text-primary" : "text-white/25"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  );
}
