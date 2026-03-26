import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { COUNTRIES as RAW_COUNTRIES } from '@/lib/countries';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RUBRIQUES: Array<{ key: 'numlist' | 'maillist' | 'fiche-client'; label: string }> = [
  { key: 'numlist', label: '📱 NUMLIST' },
  { key: 'maillist', label: '📧 MAILLIST' },
  { key: 'fiche-client', label: '👤 FICHE CLIENT' },
];

type RubriqueState = Record<string, Set<string>>;

export function AdminRubriqueCountries() {
  const [loading, setLoading] = useState(true);
  const [savingRubrique, setSavingRubrique] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<RubriqueState>({
    numlist: new Set<string>(),
    maillist: new Set<string>(),
    'fiche-client': new Set<string>(),
  });
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/rubriques/countries');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Erreur chargement');

        setState({
          numlist: new Set<string>(data?.rubriques?.numlist ?? []),
          maillist: new Set<string>(data?.rubriques?.maillist ?? []),
          'fiche-client': new Set<string>(data?.rubriques?.['fiche-client'] ?? []),
        });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Chargement impossible' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return RAW_COUNTRIES;
    return RAW_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.value.toLowerCase().includes(q));
  }, [search]);

  const toggleCountry = (rubrique: string, country: string) => {
    setState(prev => {
      const next = { ...prev };
      const currentSet = new Set(prev[rubrique] ?? []);
      if (currentSet.has(country)) currentSet.delete(country);
      else currentSet.add(country);
      next[rubrique] = currentSet;
      return next;
    });
  };

  const saveRubrique = async (rubrique: string) => {
    setSavingRubrique(rubrique);
    try {
      const countries = Array.from(state[rubrique] ?? []);
      const res = await fetch(`/api/admin/rubriques/${rubrique}/countries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur sauvegarde');
      toast({ title: 'Sauvegardé', description: `Pays disponibles mis à jour pour ${rubrique}` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Sauvegarde impossible' });
    } finally {
      setSavingRubrique(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-black text-white">Pays par Rubrique</h1>
        <p className="text-muted-foreground mt-1">Activez les pays disponibles pour chaque rubrique de la boutique.</p>
      </div>

      <div className="glass-card rounded-2xl p-4 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un pays..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {RUBRIQUES.map((rubrique) => (
          <div key={rubrique.key} className="glass-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">{rubrique.label}</h2>
              <button
                onClick={() => saveRubrique(rubrique.key)}
                disabled={savingRubrique === rubrique.key}
                className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/30 transition-colors disabled:opacity-60"
              >
                {savingRubrique === rubrique.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {state[rubrique.key]?.size ?? 0} pays activés
            </p>

            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {filteredCountries.map((country) => {
                const checked = state[rubrique.key]?.has(country.value) ?? false;
                return (
                  <label
                    key={`${rubrique.key}-${country.value}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCountry(rubrique.key, country.value)}
                      className="w-4 h-4 accent-yellow-500"
                    />
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-sm font-medium text-white">{country.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
