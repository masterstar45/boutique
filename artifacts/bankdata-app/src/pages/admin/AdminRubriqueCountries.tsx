import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { COUNTRIES as RAW_COUNTRIES } from '@/lib/countries';
import { Save, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RUBRIQUES: Array<{ key: 'numlist' | 'maillist' | 'fiche-client'; label: string; color: string }> = [
  { key: 'numlist', label: 'NUMLIST', color: 'text-blue-400' },
  { key: 'maillist', label: 'MAILLIST', color: 'text-violet-400' },
  { key: 'fiche-client', label: 'FICHE CLIENT', color: 'text-emerald-400' },
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
      toast({ title: 'Sauvegarde', description: `Pays mis a jour pour ${rubrique}` });
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
          <Loader2 className="w-6 h-6 animate-spin text-white/15" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight">Pays par Rubrique</h1>
        <p className="text-white/30 text-sm mt-0.5">Activez les pays disponibles pour chaque rubrique</p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un pays..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {RUBRIQUES.map((rubrique) => (
          <div key={rubrique.key} className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className={`text-sm font-black ${rubrique.color} uppercase tracking-wider`}>{rubrique.label}</h2>
                <p className="text-[10px] text-white/20 mt-0.5">{state[rubrique.key]?.size ?? 0} pays actives</p>
              </div>
              <button
                onClick={() => saveRubrique(rubrique.key)}
                disabled={savingRubrique === rubrique.key}
                className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs hover:bg-primary/20 transition-colors disabled:opacity-40"
              >
                {savingRubrique === rubrique.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1">
              {filteredCountries.map((country) => {
                const checked = state[rubrique.key]?.has(country.value) ?? false;
                return (
                  <label
                    key={`${rubrique.key}-${country.value}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      checked ? 'bg-white/[0.04] border border-white/[0.08]' : 'border border-transparent hover:bg-white/[0.02]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCountry(rubrique.key, country.value)}
                      className="w-3.5 h-3.5 accent-yellow-500 rounded"
                    />
                    <span className="text-lg leading-none">{country.flag}</span>
                    <span className={`text-xs font-medium ${checked ? 'text-white' : 'text-white/40'}`}>{country.name}</span>
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
