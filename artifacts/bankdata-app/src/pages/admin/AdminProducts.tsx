import React, { useRef, useState, useMemo } from 'react';
import { useAdminListProducts, useAdminCreateProduct, useAdminUpdateProduct, useAdminDeleteProduct } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, Upload, FileCheck, Image as ImageIcon, Loader2, Link, Search, PlusCircle, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpload } from '@workspace/object-storage-web';
import { COUNTRIES as RAW_COUNTRIES } from '@/lib/countries';
import type { ProductListResponse } from '@workspace/api-client-react';

const COUNTRIES = RAW_COUNTRIES.map(c => ({ value: c.value, label: `${c.flag} ${c.name}` }));

const PRODUCT_TYPES = [
  { value: 'numlist', label: '📱 NUMLIST' },
  { value: 'maillist', label: '📧 MAILLIST' },
  { value: 'fiche-client', label: '👤 FICHE CLIENT' },
];

type PriceOption = { label: string; price: string; quantity: string };

const EMPTY_PRICE_OPTION: PriceOption = { label: '', price: '', quantity: '' };

const EMPTY_FORM = {
  name: '', description: '', fileUrl: '',
  fileName: '', fileType: '', fileSize: 0,
  imageUrl: '', isActive: true, isFeatured: false,
  isBestSeller: false, isNew: true,
  productType: '', country: '',
  stock: '',
  priceOptions: [{ label: '', price: '', quantity: '' }] as PriceOption[],
};

function buildTags(productType: string, country: string): string[] {
  const tags: string[] = [];
  if (productType) tags.push(productType);
  if (country) tags.push(country);
  return tags;
}

function extractFromTags(tags: string[]): { productType: string; country: string } {
  const typeValues = PRODUCT_TYPES.map(t => t.value);
  const countryValues = COUNTRIES.map(c => c.value);
  const productType = tags.find(t => typeValues.includes(t)) ?? '';
  const country = tags.find(t => countryValues.includes(t)) ?? '';
  return { productType, country };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadButtonProps {
  value: string;
  onChange: (url: string, metadata?: { fileName: string; fileType: string; fileSize: number }) => void;
  accept?: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  initialFileName?: string;
  initialFileSize?: number;
  initialFileType?: string;
}

function FileUploadButton({ value, onChange, accept, label, icon, hint, initialFileName, initialFileSize, initialFileType }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState(initialFileName || '');
  const [uploadedFileSize, setUploadedFileSize] = useState(initialFileSize || 0);
  const [uploadedFileType, setUploadedFileType] = useState(initialFileType || '');
  const { toast } = useToast();

  // Synchronize with form data when value changes (e.g., editing existing product)
  React.useEffect(() => {
    if (value && value.startsWith('/api/storage')) {
      // Value exists, try to extract filename from storage path
      // If no uploadedFileName set yet, use a default based on the path
      if (!uploadedFileName && initialFileName) {
        setUploadedFileName(initialFileName);
      }
    }
  }, [value, initialFileName]);

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      if (!response.objectPath) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Chemin d\'objet invalide' });
        return;
      }
      const fileUrl = `/api/storage${response.objectPath}`;
      const metadata = response.metadata ? {
        fileName: response.metadata.name || uploadedFileName,
        fileType: response.metadata.contentType || uploadedFileType,
        fileSize: response.metadata.size || uploadedFileSize,
      } : {
        fileName: uploadedFileName,
        fileType: uploadedFileType,
        fileSize: uploadedFileSize,
      };
      onChange(fileUrl, metadata);
      toast({ title: '✅ Fichier uploadé', description: `Stocké à ${response.objectPath}` });
    },
    onError: (err) => {
      toast({ variant: 'destructive', title: 'Erreur upload', description: err.message });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setUploadedFileType(file.type || 'application/octet-stream');
    await uploadFile(file);
    e.target.value = '';
  };

  const hasUploadedFile = !!value && value.startsWith('/api/storage');
  const hasExternalUrl = !!value && !value.startsWith('/api/storage');

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-muted-foreground block">{label}</label>

      {/* Upload button */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
          isUploading
            ? 'border-primary/50 bg-primary/5 cursor-wait'
            : 'border-white/15 hover:border-primary/50 hover:bg-primary/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-primary font-bold">Upload en cours... {progress}%</p>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : hasUploadedFile ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-400 truncate">{uploadedFileName || 'Fichier uploadé'}</p>
              {uploadedFileSize > 0 && <p className="text-xs text-muted-foreground">{formatBytes(uploadedFileSize)}</p>}
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); setUploadedFileName(''); setUploadedFileSize(0); setUploadedFileType(''); }}
              className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-rose-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Cliquer pour uploader</p>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            <Upload className="w-4 h-4 text-muted-foreground ml-auto" />
          </div>
        )}
      </div>

      {/* Manual URL input */}
      <div className="flex items-center gap-2">
        <Link className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          type="url"
          value={hasExternalUrl ? value : ''}
          onChange={e => { onChange(e.target.value); setUploadedFileName(''); setUploadedFileSize(0); }}
          placeholder="Ou coller une URL externe..."
          className="flex-1 bg-transparent border-b border-white/10 py-1 text-xs text-muted-foreground focus:outline-none focus:border-primary/50 placeholder:text-white/20"
        />
      </div>
    </div>
  );
}

export function AdminProducts() {
  const { data, isLoading } = useAdminListProducts();
  const products = data?.products || [];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMut = useAdminCreateProduct();
  const updateMut = useAdminUpdateProduct();
  const deleteMut = useAdminDeleteProduct();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || (p.tags ?? []).includes(filterType);
      const matchCountry = !filterCountry || (p.tags ?? []).includes(filterCountry);
      const matchStatus = !filterStatus || (filterStatus === 'active' ? p.isActive : !p.isActive);
      return matchSearch && matchType && matchCountry && matchStatus;
    });
  }, [products, search, filterType, filterCountry, filterStatus]);

  const activeFiltersCount = [search, filterType, filterCountry, filterStatus].filter(Boolean).length;

  const handleOpenNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    const { productType, country } = extractFromTags(p.tags ?? []);
    const opts: PriceOption[] = p.priceOptions?.length
      ? p.priceOptions.map((o: any) => ({ label: o.label ?? '', price: o.price ?? '', quantity: String(o.quantity ?? '') }))
      : [{ label: '', price: p.price ?? '', quantity: '' }];
    setForm({
      name: p.name, description: p.description,
      fileUrl: p.fileUrl || '', fileName: p.fileName || '', fileType: p.fileType || '', fileSize: p.fileSize || 0,
      imageUrl: p.imageUrl || '',
      isActive: p.isActive, isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller, isNew: p.isNew,
      productType, country,
      stock: String(p.stock ?? ''),
      priceOptions: opts,
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };;

  const handleDelete = async (id: number) => {
    if (confirm('Supprimer ce produit ?')) {
      try {
        await deleteMut.mutateAsync({ id });
        queryClient.setQueryData(['/api/admin/products'], (current: ProductListResponse | undefined) => {
          if (!current?.products) return current;
          return {
            ...current,
            products: current.products.map((product) =>
              product.id === id ? { ...product, isActive: false } : product,
            ),
          };
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        toast({ title: 'Supprimé', description: 'Le produit a été retiré des produits actifs.' });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: err.message || 'Impossible de supprimer le produit.' });
      }
    }
  };

  const updatePriceOption = (idx: number, field: keyof PriceOption, value: string) => {
    const updated = form.priceOptions.map((o, i) => i === idx ? { ...o, [field]: value } : o);
    setForm({ ...form, priceOptions: updated });
  };

  const addPriceOption = () => setForm({ ...form, priceOptions: [...form.priceOptions, { ...EMPTY_PRICE_OPTION }] });

  const removePriceOption = (idx: number) => {
    if (form.priceOptions.length <= 1) return;
    setForm({ ...form, priceOptions: form.priceOptions.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = buildTags(form.productType, form.country);
    const validOptions = form.priceOptions.filter(o => o.label.trim() && o.price.trim());
    if (validOptions.length === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Ajoutez au moins une option de prix complète.' });
      return;
    }
    const payload = {
      name: form.name, description: form.description,
      priceOptions: validOptions,
      stock: form.stock ? parseInt(form.stock, 10) : 0,
      fileUrl: form.fileUrl || null, fileName: form.fileName || null, fileType: form.fileType || null, fileSize: form.fileSize || null,
      imageUrl: form.imageUrl || null,
      isActive: form.isActive, isFeatured: form.isFeatured,
      isBestSeller: form.isBestSeller, isNew: form.isNew,
      tags,
      categoryId: null,
    };
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, data: payload });
        toast({ title: 'Modifié', description: 'Produit mis à jour.' });
      } else {
        await createMut.mutateAsync({ data: payload });
        toast({ title: 'Créé', description: 'Produit ajouté avec succès.' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.message });
    }
  };

  const getTypeBadge = (tags: string[]) => {
    const type = PRODUCT_TYPES.find(t => tags?.includes(t.value));
    const country = COUNTRIES.find(c => tags?.includes(c.value));
    return { type, country };
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white">Produits</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez votre catalogue de données.</p>
        </div>
        <button onClick={handleOpenNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="glass-card rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">🗂️ Tous les types</option>
            {PRODUCT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Country filter */}
          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">🌍 Tous les pays</option>
            {COUNTRIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="active">✅ Actifs</option>
            <option value="">📋 Tous les statuts</option>
            <option value="inactive">⛔ Inactifs</option>
          </select>

          {/* Reset button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterCountry(''); setFilterStatus('active'); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/25 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
            {activeFiltersCount > 0 && <span className="text-primary ml-1">({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})</span>}
          </span>
          {filterType && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-bold">
              {PRODUCT_TYPES.find(t => t.value === filterType)?.label}
            </span>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-white/40 uppercase tracking-wider">
                <th className="px-4 sm:px-5 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Type / Pays</th>
                <th className="px-4 py-3 font-semibold">Options de prix</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Ventes</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Chargement...</td></tr>
              ) : filteredProducts.map(p => {
                const { type, country } = getTypeBadge(p.tags ?? []);
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black/40 flex-shrink-0 overflow-hidden flex items-center justify-center text-xl">
                          {p.imageUrl ? <img src={resolveImageUrl(p.imageUrl)} className="w-full h-full object-cover" /> : (type?.label.split(' ')[0] ?? '📦')}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm line-clamp-1">{p.name}</p>
                          {p.isFeatured && <span className="text-[9px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">PREMIUM</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {type && <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full w-fit font-bold">{type.label}</span>}
                        {country && <span className="text-[10px] px-2 py-0.5 bg-white/10 text-white/70 rounded-full w-fit">{country.label}</span>}
                        {!type && !country && <span className="text-[10px] text-red-400/70">⚠ Non classé</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      {p.priceOptions?.length > 0 ? (
                        <div className="space-y-1">
                          {p.priceOptions.map((opt: PriceOption, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-gold">{formatMoney(opt.price)}</span>
                              {opt.label && <span className="text-white/50 text-xs">{opt.label}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-bold text-white">{formatMoney(p.price)}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {p.stock > 0 ? (() => {
                        const remaining = Math.max(0, p.stock - (p.stockUsed ?? 0));
                        const pct = Math.max(0, Math.min(100, (remaining / p.stock) * 100));
                        const isLow = pct < 20;
                        const color = isLow ? 'bg-red-500' : pct < 50 ? 'bg-yellow-500' : 'bg-emerald-500';
                        return (
                          <div className="min-w-[90px]">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className={`font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>{remaining.toLocaleString('fr-FR')}</span>
                              <span className="text-white/30">/{p.stock.toLocaleString('fr-FR')}</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })() : <span className="text-white/20 text-xs">—</span>}
                    </td>
                    <td className="p-4 text-muted-foreground">{p.totalSales}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-bold ${p.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
                        {p.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleOpenEdit(p)} className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors mr-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-rose-400 hover:bg-rose-400/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Search className="w-8 h-8 opacity-30" />
                      <p className="font-medium">
                        {products.length === 0 ? 'Aucun produit.' : 'Aucun produit ne correspond aux filtres.'}
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={() => { setSearch(''); setFilterType(''); setFilterCountry(''); setFilterStatus('active'); }}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="glass-card w-full max-w-2xl bg-card rounded-3xl relative z-10 max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-card/90 backdrop-blur-md">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Modifier Produit' : 'Nouveau Produit'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* ── BOUTIQUE CLASSEMENT ── */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider">🗂️ Classement Boutique</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground block mb-2">Type de données *</label>
                    <select
                      required
                      value={form.productType}
                      onChange={e => setForm({ ...form, productType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50"
                    >
                      <option value="">-- Choisir type --</option>
                      {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-muted-foreground block mb-2">Pays *</label>
                    <select
                      required
                      value={form.country}
                      onChange={e => setForm({ ...form, country: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50"
                    >
                      <option value="">-- Choisir pays --</option>
                      {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                {form.productType && form.country && (
                  <p className="text-xs text-primary/80 bg-primary/10 px-3 py-2 rounded-lg">
                    ✓ Apparaîtra dans <strong>{PRODUCT_TYPES.find(t => t.value === form.productType)?.label}</strong> → <strong>{COUNTRIES.find(c => c.value === form.country)?.label}</strong>
                  </p>
                )}
              </div>

              {/* ── INFOS ── */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Nom du produit</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field w-full" placeholder="Ex: NUMLIST 🇫🇷 France — 500K numéros" />
                </div>
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Description</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field w-full min-h-[100px]" placeholder="Description détaillée du produit..." />
                </div>
                {/* ── OPTIONS DE PRIX ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-muted-foreground">Options de prix (€)</label>
                    <button type="button" onClick={addPriceOption} className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 font-semibold transition-colors">
                      <PlusCircle size={14} /> Ajouter option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.priceOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <GripVertical size={14} className="text-white/20 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Label (ex: 10K contacts)"
                          value={opt.label}
                          onChange={e => updatePriceOption(idx, 'label', e.target.value)}
                          className="input-field flex-1 text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Qté"
                          title="Nombre de contacts/mails inclus dans cette option"
                          value={opt.quantity}
                          onChange={e => updatePriceOption(idx, 'quantity', e.target.value)}
                          className="input-field w-24 text-sm"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Prix €"
                          value={opt.price}
                          onChange={e => updatePriceOption(idx, 'price', e.target.value)}
                          className="input-field w-24 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removePriceOption(idx)}
                          disabled={form.priceOptions.length <= 1}
                          className="text-red-400 hover:text-red-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground/60 pl-6">Label · Qté incluse · Prix — ex: "10 000 emails", 10000, 29.99</p>
                  </div>
                  {form.priceOptions.length > 0 && form.priceOptions[0].price && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Prix de base affiché : <span className="text-gold font-bold">{parseFloat(form.priceOptions[0].price).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                      {form.priceOptions.length > 1 && <span className="ml-1">(première option)</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* ── STOCK ── */}
              <div className="pt-2 border-t border-white/10">
                <label className="text-sm font-bold text-muted-foreground block mb-2">
                  📦 Stock total uploadé <span className="text-white/40 font-normal">(nombre total de contacts/mails dans le fichier)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    className="input-field w-48"
                    placeholder="ex: 25000"
                  />
                  {form.stock && (
                    <span className="text-sm text-white/50">
                      = <span className="text-white font-bold">{parseInt(form.stock).toLocaleString('fr-FR')}</span> enregistrements
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Chaque commande déduira automatiquement la quantité achetée de ce stock.</p>
              </div>

              {/* ── FICHIERS ── */}
              <div className="space-y-4 pt-2 border-t border-white/10">
                <h3 className="text-sm font-black text-white/60 uppercase tracking-wider">📁 Fichiers</h3>

                <FileUploadButton
                  label="Fichier de stock (données à distribuer)"
                  value={form.fileUrl}
                  onChange={(v, metadata) => setForm({ ...form, fileUrl: v, fileName: metadata?.fileName || '', fileType: metadata?.fileType || '', fileSize: metadata?.fileSize || 0 })}
                  accept=".txt,.csv"
                  icon={<Upload className="w-5 h-5 text-white/50" />}
                  hint="TXT ou CSV — 1 enregistrement par ligne — max 50 MB"
                  initialFileName={form.fileName}
                  initialFileSize={form.fileSize}
                  initialFileType={form.fileType}
                />
                <p className="text-[11px] text-amber-400/70 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                  ⚡ À chaque commande, un fichier TXT est généré automatiquement avec le nombre d'enregistrements commandés, puis livré au client. Le stock diminue à chaque vente.
                </p>

                <FileUploadButton
                  label="Image produit (optionnelle)"
                  value={form.imageUrl}
                  onChange={v => setForm({ ...form, imageUrl: v })}
                  accept="image/*"
                  icon={<ImageIcon className="w-5 h-5 text-white/50" />}
                  hint="JPG, PNG, WebP — max 5 MB"
                />
              </div>

              {/* ── FLAGS ── */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                {[
                  { key: 'isActive', label: '✅ Actif', desc: 'Visible en boutique' },
                  { key: 'isFeatured', label: '⭐ Premium', desc: 'Badge PREMIUM' },
                  { key: 'isBestSeller', label: '🔥 Best Seller', desc: 'Badge BEST SELLER' },
                  { key: 'isNew', label: '⚡ Nouveau', desc: 'Badge NOUVEAU' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="w-5 h-5 accent-primary rounded" />
                    <div>
                      <p className="text-white font-bold text-sm">{label}</p>
                      <p className="text-muted-foreground text-[10px]">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary w-full py-4 text-lg">
                {createMut.isPending || updateMut.isPending ? 'Enregistrement...' : (editingId ? '✓ Mettre à jour' : '✓ Créer le produit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
