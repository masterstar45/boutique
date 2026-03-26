import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Edit2, Trash2, X, GripVertical, ExternalLink, AppWindow, ToggleLeft, ToggleRight } from 'lucide-react';
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
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
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
      toast({ title: 'Supprimé' });
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
        toast({ title: 'Modifié', description: 'Bouton mis à jour' });
      } else {
        await apiFetch('/admin/bot-buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast({ title: 'Créé', description: 'Bouton ajouté' });
      }
      setIsModalOpen(false);
      loadButtons();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-black text-white">Boutons Bot /start</h1>
          <p className="text-muted-foreground mt-1">Personnalisez les boutons affichés sous le message /start du bot Telegram.</p>
        </div>
        <button onClick={handleOpenNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      </div>

      {/* Info card */}
      <div className="glass-card rounded-2xl p-4 mb-6 border border-primary/20 bg-primary/5">
        <p className="text-sm text-primary/80">
          💡 Le bouton <strong>"🛒 Accéder à la boutique"</strong> est toujours affiché en premier. Les boutons ci-dessous s'ajoutent en dessous, triés par ordre.
        </p>
      </div>

      {/* Preview */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Aperçu Telegram</h2>
        <div className="bg-[#1a2236] rounded-xl p-4 max-w-sm mx-auto space-y-2">
          {/* Default button always shown */}
          <div className="bg-[#2f6ea5] text-white text-center py-2 px-4 rounded-lg text-sm font-medium">
            🛒 Accéder à la boutique
          </div>
          {buttons.filter(b => b.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(btn => (
            <div key={btn.id} className="bg-[#2f6ea5] text-white text-center py-2 px-4 rounded-lg text-sm font-medium opacity-90">
              {btn.label}
            </div>
          ))}
          {buttons.filter(b => b.isActive).length === 0 && (
            <p className="text-center text-white/30 text-xs py-1">Aucun bouton personnalisé</p>
          )}
        </div>
      </div>

      {/* Buttons table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-sm text-white/70 bg-black/30">
              <th className="p-4 font-semibold w-12">Ordre</th>
              <th className="p-4 font-semibold">Label</th>
              <th className="p-4 font-semibold">URL</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Statut</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
            ) : buttons.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun bouton personnalisé. Cliquez "Ajouter" pour créer.</td></tr>
            ) : [...buttons].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(btn => (
              <tr key={btn.id} className="border-b border-white/8 bg-white/[0.02] hover:bg-white/[0.06] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-1 text-white/55">
                    <GripVertical className="w-4 h-4" />
                    <span className="font-mono text-sm">{btn.sortOrder}</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-white">{btn.label}</td>
                <td className="p-4">
                  <span className="text-sm text-white/60 truncate max-w-[200px] block">{btn.url}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-bold ${
                    btn.isWebApp ? 'bg-blue-500/20 text-blue-300 border border-blue-400/20' : 'bg-white/10 text-white/75 border border-white/10'
                  }`}>
                    {btn.isWebApp ? <><AppWindow className="w-3 h-3" /> Web App</> : <><ExternalLink className="w-3 h-3" /> Lien</>}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => handleToggle(btn)} className="group rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors">
                    {btn.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold"><ToggleRight className="w-5 h-5" /> Actif</span>
                    ) : (
                      <span className="flex items-center gap-1 text-white/50 text-xs font-bold"><ToggleLeft className="w-5 h-5" /> Inactif</span>
                    )}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleOpenEdit(btn)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-bold text-xs">
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(btn.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors font-bold text-xs">
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-display font-black text-white mb-6">
              {editingId !== null ? 'Modifier le bouton' : 'Nouveau bouton'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Label */}
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">Label du bouton</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="Ex: 📞 Support Client"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                  required
                />
              </div>

              {/* URL */}
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">URL</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  placeholder="https://... ou t.me/..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isWebApp: false })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                      !form.isWebApp ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-white/50'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" /> Lien externe
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isWebApp: true })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                      form.isWebApp ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-white/50'
                    }`}
                  >
                    <AppWindow className="w-4 h-4" /> Web App
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.isWebApp ? '⚡ Ouvre une Web App dans Telegram (comme la boutique)' : '🔗 Ouvre un lien externe dans le navigateur'}
                </p>
              </div>

              {/* Sort order */}
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1">Ordre d'affichage</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  min={0}
                />
                <p className="text-xs text-muted-foreground mt-1">Plus le nombre est petit, plus le bouton apparaît haut.</p>
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-3 font-bold text-sm"
              >
                {editingId !== null ? 'Sauvegarder' : 'Créer le bouton'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
