import React, { useState } from 'react';
import { useAdminListUsers } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Users as UsersIcon, ShieldCheck, Shield, Lock, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export function AdminUsers() {
  const { data, isLoading } = useAdminListUsers();
  const users = data?.users || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      String(u.telegramId).includes(q)
    );
  });

  const handleToggleAdmin = async (userId: number, currentIsAdmin: boolean) => {
    if (!confirm(`${currentIsAdmin ? 'Retirer' : 'Donner'} les droits admin a cet utilisateur ?`)) return;
    setTogglingId(userId);
    try {
      const token = localStorage.getItem('bankdata_token');
      const res = await fetch(`/api/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise a jour');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: currentIsAdmin ? 'Admin retire' : 'Admin accorde',
        description: `L'utilisateur est maintenant ${!currentIsAdmin ? 'admin' : 'standard'}.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  const totalBalance = users.reduce((sum, u) => sum + parseFloat(String(u.balance || '0')), 0);
  const adminCount = users.filter(u => u.isAdmin).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Utilisateurs</h1>
          <p className="text-white/30 text-sm mt-0.5">Base clients — {users.length} inscrits</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-white mt-1">{users.length}</p>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Admins</p>
          <p className="text-2xl font-black text-primary mt-1">{adminCount}</p>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
          <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider">Solde Total</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{formatMoney(totalBalance)}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Telegram ID</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Solde</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/15 mx-auto" /></td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.photoUrl
                          ? <img src={user.photoUrl} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-white/30">{(user.firstName?.[0] || '?').toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm truncate">{user.firstName} {user.lastName}</div>
                        <div className="text-[10px] text-primary/60 font-medium">@{user.username || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-white/30 font-mono text-xs">{user.telegramId}</td>
                  <td className="px-4 py-3.5 font-bold text-white text-sm">{formatMoney(user.balance)}</td>
                  <td className="px-4 py-3.5">
                    {user.id === currentUser?.id ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary ring-1 ring-primary/20 cursor-not-allowed opacity-70" title="Vous ne pouvez pas modifier votre propre role">
                        <Lock className="w-2.5 h-2.5" /> Vous
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin ?? false)}
                        disabled={togglingId === user.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 transition-all ${
                          user.isAdmin
                            ? 'bg-primary/10 text-primary ring-primary/20 hover:bg-rose-500/10 hover:text-rose-400 hover:ring-rose-500/20'
                            : 'bg-white/[0.03] text-white/35 ring-white/[0.08] hover:bg-primary/10 hover:text-primary hover:ring-primary/20'
                        }`}
                      >
                        {user.isAdmin
                          ? <><ShieldCheck className="w-2.5 h-2.5" /> Admin</>
                          : <><Shield className="w-2.5 h-2.5" /> Standard</>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-white/25 text-xs">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="p-14 text-center">
                  <UsersIcon className="w-10 h-10 text-white/[0.05] mx-auto mb-3" />
                  <p className="text-sm text-white/20">Aucun utilisateur</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
