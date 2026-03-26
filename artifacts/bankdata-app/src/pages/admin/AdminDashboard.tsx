import React from 'react';
import { Link } from 'wouter';
import { useGetAdminStats, useAdminListOrders } from '@workspace/api-client-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, ArrowRight } from 'lucide-react';

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: ordersData, isLoading: ordersLoading } = useAdminListOrders();
  
  const recentOrders = ordersData?.orders?.slice(0, 5) || [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-black text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Aperçu en temps réel et accès à toutes les fonctions admin depuis un seul onglet.</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Toutes les fonctions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Produits', href: '/admin/produits' },
            { label: 'Pays par Rubrique', href: '/admin/rubriques-pays' },
            { label: 'Commandes', href: '/admin/commandes' },
            { label: 'Utilisateurs', href: '/admin/utilisateurs' },
            { label: 'Promo Codes', href: '/admin/promo-codes' },
            { label: 'Admins & Crédits', href: '/admin/admins' },
            { label: 'Affiliation', href: '/admin/affiliation' },
            { label: 'Boutons Bot /start', href: '/admin/boutons-bot' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              <span>{item.label}</span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </Link>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenu Total', value: formatMoney(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Commandes', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Utilisateurs', value: stats?.totalUsers || 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Produits', value: stats?.totalProducts || 0, icon: Package, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
        ].map((stat, i) => (
          <div key={i} className={`glass-card p-6 rounded-2xl ${stat.border}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-bold">{stat.label}</p>
            <h3 className="text-2xl font-black text-white mt-1">{statsLoading ? '...' : stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 rounded-full bg-primary/20 text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Revenus Aujourd'hui</p>
            <p className="text-xl font-bold text-white">{formatMoney(stats?.revenueToday || 0)}</p>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 rounded-full bg-blue-500/20 text-blue-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Commandes Aujourd'hui</p>
            <p className="text-xl font-bold text-white">{stats?.ordersToday || 0}</p>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 rounded-full bg-purple-500/20 text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-bold">Nouveaux Inscrits</p>
            <p className="text-xl font-bold text-white">{stats?.newUsersToday || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="mt-8 glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h2 className="text-lg font-bold text-white">Dernières Commandes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-sm text-muted-foreground">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Montant</th>
                <th className="p-4 font-semibold">Statut</th>
                <th className="p-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white font-mono">#{order.id}</td>
                  <td className="p-4 text-white">{order.username || `User ${order.userId}`}</td>
                  <td className="p-4 font-bold text-primary">{formatMoney(order.amount)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      order.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground text-sm">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
