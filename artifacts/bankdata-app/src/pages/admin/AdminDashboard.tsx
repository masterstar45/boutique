import React from 'react';
import { Link } from 'wouter';
import { useGetAdminStats, useAdminListOrders } from '@workspace/api-client-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import {
  DollarSign, ShoppingCart, Users, Package, TrendingUp, ArrowRight,
  ArrowUpRight, ShieldCheck, Tag, UserPlus, Globe, Bot, Loader2
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Produits', desc: 'Catalogue', href: '/admin/produits', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Commandes', desc: 'Transactions', href: '/admin/commandes', icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Utilisateurs', desc: 'Base clients', href: '/admin/utilisateurs', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'Promo Codes', desc: 'Réductions', href: '/admin/promo-codes', icon: Tag, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { label: 'Admins', desc: 'Accès & crédits', href: '/admin/admins', icon: ShieldCheck, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Affiliation', desc: 'Parrainages', href: '/admin/affiliation', icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { label: 'Pays', desc: 'Par rubrique', href: '/admin/rubriques-pays', icon: Globe, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { label: 'Bot', desc: 'Boutons /start', href: '/admin/boutons-bot', icon: Bot, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
];

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: ordersData, isLoading: ordersLoading } = useAdminListOrders();

  const recentOrders = ordersData?.orders?.slice(0, 5) || [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d'ensemble de votre boutique.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenu Total', value: formatMoney(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
          { label: 'Commandes', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/15' },
          { label: 'Utilisateurs', value: stats?.totalUsers || 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/15' },
          { label: 'Produits', value: stats?.totalProducts || 0, icon: Package, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/15' },
        ].map((stat, i) => (
          <div key={i} className={`glass-card rounded-2xl p-4 sm:p-5 border ${stat.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 sm:p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-white/30" /> : stat.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Revenus Aujourd'hui", value: formatMoney(stats?.revenueToday || 0), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          { label: "Commandes Aujourd'hui", value: stats?.ordersToday || 0, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: "Nouveaux Inscrits", value: stats?.newUsersToday || 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stat.bg} flex-shrink-0`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-semibold">{stat.label}</p>
              <p className="text-lg font-black text-white">
                {statsLoading ? <Loader2 className="w-4 h-4 animate-spin text-white/30" /> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Accès rapide</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
            >
              <div className={`p-2 rounded-lg ${item.bg} flex-shrink-0`}>
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white block truncate">{item.label}</span>
                <span className="text-[10px] text-white/30">{item.desc}</span>
              </div>
              <ArrowUpRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06] flex justify-between items-center">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">Dernières Commandes</h2>
          <Link href="/admin/commandes" className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary font-semibold transition-colors">
            Tout voir <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04] text-[11px] text-white/40 uppercase tracking-wider">
                <th className="px-4 sm:px-5 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">Aucune commande.</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 sm:px-5 py-3.5 text-white/70 font-mono text-xs">#{order.id}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-white">{order.username || `User ${order.userId}`}</span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-primary text-sm">{formatMoney(order.amount)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-bold tracking-wide ${
                      order.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' :
                      order.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400' :
                      order.status === 'completed' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-rose-500/15 text-rose-400'
                    }`}>
                      {order.status === 'confirmed' ? 'Confirmé' :
                       order.status === 'pending' ? 'En attente' :
                       order.status === 'completed' ? 'Terminé' :
                       'Annulé'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-white/30 text-xs">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
