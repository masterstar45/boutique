import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Edit2, Trash2, X, GripVertical, ExternalLink, AppWindow, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotButton {
  id: number;
  label: string;
  url: string;
  isWebApp: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = { label: '', url: '', isWebApp: false, sortOrder: 0 };

function normalizeUrlInput(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) return value;
  return `https://${value}`;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: 'Erreur reseau' }));
    throw new Error(err.error || 'Erreur');
  }
  if (res.status === 204) return null;
  return res.json();
}

export function AdminBotButtons() {
  const { toast } = useToast();
  const [buttons, setButtons] = useState<BotButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadButtons = useCallback(async () => {
    try {
      const data = await apiFetch('/admin/bot-buttons');
      setButtons(data.buttons);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les boutons' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadButtons(); }, [loadButtons]);

  const handleOpenNew = () => {
    setForm({ ...EMPTY_FORM, sortOrder: buttons.length });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (btn: BotButton) => {
    setForm({ label: btn.label, url: btn.url, isWebApp: btn.isWebApp, sortOrder: btn.sortOrder });
    setEditingId(btn.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce bouton ?')) return;
    try {
      await apiFetch(`/admin/bot-buttons/${id}`, { method: 'DELETE' });
      toast({ title: 'Supprime' });
      loadButtons();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const handleToggle = async (btn: BotButton) => {
    try {
      await apiFetch(`/admin/bot-buttons/${btn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !btn.isActive }),
      });
      loadButtons();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = normalizeUrlInput(form.url);
    if (!form.label.trim() || !normalizedUrl) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Label et URL sont requis' });
      return;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'URL invalide' });
      return;
    }

    const payload = { ...form, url: normalizedUrl };

    try {
      if (editingId !== null) {
        await apiFetch(`/admin/bot-buttons/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast({ title: 'Modifie', description: 'Bouton mis a jour' });
      } else {
        await apiFetch('/admin/bot-buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast({ title: 'Cree', description: 'Bouton ajoute' });
      }
      setIsModalOpen(false);
      loadButtons();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const sortedButtons = [...buttons].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Bot Telegram</h1>
          <p className="text-white/30 text-sm mt-0.5">Boutons affiches sous le message /start</p>
        </div>
        <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 mb-5 text-xs text-primary/60">
        Le bouton "Acceder a la boutique" est toujours affiche en premier. Les boutons ci-dessous s'ajoutent en dessous.
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 mb-5">
        <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-3">Apercu Telegram</p>
        <div className="bg-[#1a2236] rounded-xl p-3 max-w-sm mx-auto space-y-1.5">
          <div className="bg-[#2f6ea5] text-white text-center py-2 px-4 rounded-lg text-sm font-medium">
            Acceder a la boutique
          </div>
          {buttons.filter(b => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(btn => (
            <div key={btn.id} className="bg-[#2f6ea5] text-white text-center py-2 px-4 rounded-lg text-sm font-medium opacity-80">
              {btn.label}
            </div>
          ))}
          {buttons.filter(b => b.isActive).length === 0 && (
            <p className="text-center text-white/20 text-[11px] py-1">Aucun bouton personnalise</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider w-12">Ordre</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Label</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">URL</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/15 mx-auto" /></td></tr>
              ) : buttons.length === 0 ? (
                <tr><td colSpan={6} className="p-14 text-center text-white/20 text-sm">Aucun bouton personnalise</td></tr>
              ) : sortedButtons.map(btn => (
                <tr key={btn.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-white/30">
                      <GripVertical className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{btn.sortOrder}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white text-sm">{btn.label}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-white/30 truncate max-w-[180px] block">{btn.url}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md font-bold ring-1 ${
                      btn.isWebApp ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20' : 'bg-white/[0.04] text-white/40 ring-white/[0.08]'
                    }`}>
                      {btn.isWebApp ? <><AppWindow className="w-3 h-3" /> Web App</> : <><ExternalLink className="w-3 h-3" /> Lien</>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => handleToggle(btn)} className="group">
                      {btn.isActive ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold"><ToggleRight className="w-4 h-4" /> Actif</span>
                      ) : (
                        <span className="flex items-center gap-1 text-white/25 text-[10px] font-bold"><ToggleLeft className="w-4 h-4" /> Inactif</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => handleOpenEdit(btn)} className="p-1.5 rounded-lg text-blue-400/60 hover:bg-blue-500/10 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(btn.id)} className="p-1.5 rounded-lg text-rose-400/60 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="w-full max-w-md bg-[hsl(240,10%,7%)] rounded-2xl relative z-10 border border-white/[0.08] shadow-2xl">
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-lg font-black text-white">{editingId !== null ? 'Modifier' : 'Nouveau bouton'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Label</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="Ex: Support Client"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">URL</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  placeholder="https://... ou t.me/..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isWebApp: false })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      !form.isWebApp ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/[0.06] bg-white/[0.03] text-white/30'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Lien
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isWebApp: true })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      form.isWebApp ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/[0.06] bg-white/[0.03] text-white/30'
                    }`}
                  >
                    <AppWindow className="w-3.5 h-3.5" /> Web App
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Ordre</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.15] transition-colors"
                  min={0}
                />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors">
                {editingId !== null ? 'Sauvegarder' : 'Creer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
