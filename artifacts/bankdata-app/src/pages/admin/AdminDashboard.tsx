import React from 'react';
import { Link } from 'wouter';
import { useGetAdminStats, useAdminListOrders } from '@workspace/api-client-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import {
  DollarSign, ShoppingCart, Users, Package, TrendingUp, ArrowRight,
  ArrowUpRight, ShieldCheck, Tag, UserPlus, Globe, Bot, Loader2, Activity, Clock
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Produits', href: '/admin/produits', icon: Package, color: 'text-blue-400', gradient: 'from-blue-500/15 to-blue-600/5' },
  { label: 'Commandes', href: '/admin/commandes', icon: ShoppingCart, color: 'text-emerald-400', gradient: 'from-emerald-500/15 to-emerald-600/5' },
  { label: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users, color: 'text-violet-400', gradient: 'from-violet-500/15 to-violet-600/5' },
  { label: 'Promo', href: '/admin/promo-codes', icon: Tag, color: 'text-rose-400', gradient: 'from-rose-500/15 to-rose-600/5' },
  { label: 'Admins', href: '/admin/admins', icon: ShieldCheck, color: 'text-primary', gradient: 'from-primary/15 to-primary/5' },
  { label: 'Affiliation', href: '/admin/affiliation', icon: UserPlus, color: 'text-cyan-400', gradient: 'from-cyan-500/15 to-cyan-600/5' },
  { label: 'Pays', href: '/admin/rubriques-pays', icon: Globe, color: 'text-orange-400', gradient: 'from-orange-500/15 to-orange-600/5' },
  { label: 'Bot', href: '/admin/boutons-bot', icon: Bot, color: 'text-indigo-400', gradient: 'from-indigo-500/15 to-indigo-600/5' },
];

function StatCard({ label, value, icon: Icon, color, gradient, loading }: {
  label: string; value: React.ReactNode; icon: React.ElementType; color: string; gradient: string; loading: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-white/[0.06] p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-white/20" /> : value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl bg-white/[0.06] ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${gradient} opacity-40 blur-2xl`} />
    </div>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: ordersData, isLoading: ordersLoading } = useAdminListOrders();
  const recentOrders = ordersData?.orders?.slice(0, 6) || [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-white/30 text-sm mt-0.5">Vue d'ensemble de votre boutique</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>En ligne</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Revenu Total" value={formatMoney(stats?.totalRevenue || 0)} icon={DollarSign} color="text-emerald-400" gradient="from-emerald-500/10 to-emerald-900/5" loading={statsLoading} />
        <StatCard label="Commandes" value={stats?.totalOrders || 0} icon={ShoppingCart} color="text-blue-400" gradient="from-blue-500/10 to-blue-900/5" loading={statsLoading} />
        <StatCard label="Utilisateurs" value={stats?.totalUsers || 0} icon={Users} color="text-violet-400" gradient="from-violet-500/10 to-violet-900/5" loading={statsLoading} />
        <StatCard label="Produits" value={stats?.totalProducts || 0} icon={Package} color="text-primary" gradient="from-primary/10 to-primary/5" loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {[
          { label: "Revenus du jour", value: formatMoney(stats?.revenueToday || 0), icon: TrendingUp, color: 'text-primary' },
          { label: "Commandes du jour", value: stats?.ordersToday || 0, icon: Clock, color: 'text-blue-400' },
          { label: "Nouveaux inscrits", value: stats?.newUsersToday || 0, icon: Users, color: 'text-violet-400' },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
            <div className={`p-2 rounded-lg bg-white/[0.04] flex-shrink-0 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-black text-white">
                {statsLoading ? <Loader2 className="w-4 h-4 animate-spin text-white/20" /> : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-2.5 rounded-xl bg-gradient-to-br ${item.gradient} border border-white/[0.05] px-3 py-3 hover:border-white/[0.12] hover:scale-[1.02] transition-all duration-200`}
          >
            <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
            <span className="text-xs font-semibold text-white/70 group-hover:text-white truncate">{item.label}</span>
            <ArrowUpRight className="w-3 h-3 text-white/15 group-hover:text-white/40 ml-auto flex-shrink-0 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-white/[0.05] flex justify-between items-center">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">Dernières Commandes</h2>
          <Link href="/admin/commandes" className="flex items-center gap-1 text-xs text-primary/60 hover:text-primary font-semibold transition-colors">
            Tout voir <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Montant</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/15 mx-auto" /></td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-white/20 text-sm">Aucune commande</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                  <td className="px-5 py-3.5 text-white/50 font-mono text-xs">#{order.id}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-white/80">{order.username || `User ${order.userId}`}</td>
                  <td className="px-4 py-3.5 font-bold text-primary text-sm">{formatMoney(order.amount)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-md font-bold tracking-wide ${
                      order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
                      order.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' :
                      order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20' :
                      'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                    }`}>
                      {order.status === 'completed' ? 'Terminé' :
                       order.status === 'confirmed' ? 'Confirmé' :
                       order.status === 'pending' ? 'En attente' : 'Annulé'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-white/25 text-xs">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
