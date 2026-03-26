import React, { useState } from 'react';
import { useAdminListUsers } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Users as UsersIcon, ShieldCheck, Shield, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export function AdminUsers() {
  const { data, isLoading } = useAdminListUsers();
  const users = data?.users || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleAdmin = async (userId: number, currentIsAdmin: boolean) => {
    if (!confirm(`${currentIsAdmin ? 'Retirer' : 'Donner'} les droits admin à cet utilisateur ?`)) return;
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
      if (!res.ok) throw new Error('Erreur lors de la mise à jour');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: currentIsAdmin ? 'Admin retiré' : 'Admin accordé',
        description: `L'utilisateur est maintenant ${!currentIsAdmin ? 'admin' : 'standard'}.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white">Utilisateurs</h1>
        <p className="text-muted-foreground text-sm mt-1">Base clients — {users.length} inscrits.</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-white/40 uppercase tracking-wider">
                <th className="px-4 sm:px-5 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Telegram ID</th>
                <th className="px-4 py-3 font-semibold">Solde</th>
                <th className="px-4 py-3 font-semibold">Rôle</th>
                <th className="px-4 py-3 font-semibold text-right">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.photoUrl
                          ? <img src={user.photoUrl} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-bold text-white/40">{(user.firstName?.[0] || '?').toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{user.firstName} {user.lastName}</div>
                        <div className="text-[10px] text-primary/70 font-medium">@{user.username || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-white/40 font-mono text-xs">{user.telegramId}</td>
                  <td className="px-4 py-3.5 font-bold text-white text-sm">{formatMoney(user.balance)}</td>
                  <td className="px-4 py-3.5">
                    {user.id === currentUser?.id ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-primary/15 text-primary border-primary/25 cursor-not-allowed opacity-70" title="Vous ne pouvez pas modifier votre propre rôle">
                        <Lock className="w-2.5 h-2.5" /> Admin (vous)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin ?? false)}
                        disabled={togglingId === user.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                          user.isAdmin
                            ? 'bg-primary/15 text-primary border-primary/25 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/25'
                            : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-primary/15 hover:text-primary hover:border-primary/25'
                        }`}
                      >
                        {user.isAdmin
                          ? <><ShieldCheck className="w-2.5 h-2.5" /> Admin</>
                          : <><Shield className="w-2.5 h-2.5" /> Standard</>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-white/30 text-xs">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
              {users.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="p-12 text-center">
                  <UsersIcon className="w-10 h-10 text-white/[0.06] mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
