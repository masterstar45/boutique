import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, ShoppingCart, Clock, User, MessageCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: Home, label: 'Accueil', href: '/' },
  { icon: ShoppingCart, label: 'Panier', href: '/panier', badge: true },
  { icon: Clock, label: 'Commandes', href: '/commandes' },
  { icon: MessageCircle, label: 'Contact', href: '/contact' },
  { icon: User, label: 'Profil', href: '/profil' },
];

export function MiniAppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { totalItems } = useCart();

  return (
    <div className="min-h-screen pb-36 relative overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <img 
          src={`${import.meta.env.BASE_URL}images/mesh-bg.png`} 
          alt="Background" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[100px]" />
      </div>

      {children}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full glass-panel pt-2 px-6 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
        <div className="flex items-center justify-between max-w-md mx-auto relative pb-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 group relative w-16">
                <div className={cn(
                  "relative p-3 rounded-2xl transition-all duration-300",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-white"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
                  
                  {item.badge && totalItems > 0 && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-black flex items-center justify-center animate-in zoom-in">
                      {totalItems > 9 ? '9+' : totalItems}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold transition-all duration-300",
                  isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-70 group-hover:opacity-100"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-2 w-8 h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  );
}
