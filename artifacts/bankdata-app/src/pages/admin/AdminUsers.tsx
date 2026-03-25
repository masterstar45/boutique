import React, { useState } from 'react';
import { useAdminListUsers } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Users as UsersIcon, ShieldCheck, Shield, Lock } from 'lucide-react';
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
      <div className="mb-8">
        <h1 className="text-3xl font-display font-black text-white">Utilisateurs</h1>
        <p className="text-muted-foreground mt-1">Base clients de la plateforme — {users.length} inscrits.</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-sm text-muted-foreground bg-black/20">
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Telegram ID</th>
                <th className="p-4 font-semibold">Solde</th>
                <th className="p-4 font-semibold">Rôle</th>
                <th className="p-4 font-semibold text-right">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.photoUrl
                          ? <img src={user.photoUrl} className="w-full h-full object-cover" />
                          : <UsersIcon className="w-4 h-4 text-white/50" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-primary">@{user.username || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-sm">{user.telegramId}</td>
                  <td className="p-4 font-bold text-white">{formatMoney(user.balance)}</td>
                  <td className="p-4">
                    {user.id === currentUser?.id ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-primary/20 text-primary border-primary/40 w-fit cursor-not-allowed opacity-60" title="Vous ne pouvez pas modifier votre propre rôle">
                        <Lock className="w-3 h-3" /> Admin (vous)
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin ?? false)}
                        disabled={togglingId === user.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          user.isAdmin
                            ? 'bg-primary/20 text-primary border-primary/40 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                            : 'bg-white/5 text-white/50 border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/40'
                        }`}
                      >
                        {user.isAdmin
                          ? <><ShieldCheck className="w-3 h-3" /> Admin</>
                          : <><Shield className="w-3 h-3" /> Standard</>}
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-right text-muted-foreground text-sm">
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
              {users.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Aucun utilisateur.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
