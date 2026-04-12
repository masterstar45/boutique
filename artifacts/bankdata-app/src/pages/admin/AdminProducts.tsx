import React, { useRef, useState, useMemo } from 'react';
import { useAdminListProducts, useAdminCreateProduct, useAdminUpdateProduct, useAdminDeleteProduct } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import { Plus, Edit2, Trash2, X, Upload, FileCheck, Image as ImageIcon, Loader2, Link, Search, PlusCircle, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES as RAW_COUNTRIES } from '@/lib/countries';
import type { ProductListResponse } from '@workspace/api-client-react';

const COUNTRIES = RAW_COUNTRIES.map(c => ({ value: c.value, label: `${c.flag} ${c.name}` }));

const PRODUCT_TYPES = [
  { value: 'numlist', label: 'NUMLIST' },
  { value: 'maillist', label: 'MAILLIST' },
  { value: 'fiche-client', label: 'FICHE CLIENT' },
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

function normalizePriceInput(raw: string): string {
  const normalized = String(raw ?? "").replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return "0.00";
  return (Math.round(parsed * 100) / 100).toFixed(2);
}

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

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).__API_BASE_URL) {
    return String((window as any).__API_BASE_URL).replace(/\/+$/, '');
  }
  const env = (import.meta as any)?.env?.VITE_API_BASE_URL;
  if (typeof env === 'string' && env.trim()) {
    return env.trim().replace(/\/+$/, '');
  }
  return 'https://api-server-production-823c.up.railway.app';
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
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  React.useEffect(() => {
    if (value && value.startsWith('/api/storage')) {
      if (!uploadedFileName && initialFileName) {
        setUploadedFileName(initialFileName);
      }
    }
  }, [value, initialFileName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setUploadedFileType(file.type || 'application/octet-stream');
    setIsUploading(true);
    setProgress(5);

    try {
      const apiBase = resolveApiBaseUrl();
      const token = localStorage.getItem('bankdata_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      setProgress(20);
      const requestUrlRes = await fetch(`${apiBase}/api/storage/uploads/request-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      const requestUrlData = await requestUrlRes.json().catch(() => ({}));
      if (!requestUrlRes.ok) {
        throw new Error(requestUrlData?.error || `Echec preparation upload (${requestUrlRes.status})`);
      }

      const objectPath = String(requestUrlData?.objectPath || '');
      const objectId = objectPath.split('/').filter(Boolean).pop();
      if (!objectId) {
        throw new Error('objectPath invalide recu du serveur');
      }

      setProgress(55);
      const directRes = await fetch(`${apiBase}/api/storage/uploads/direct/${objectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          ...authHeaders,
        },
        body: file,
      });

      if (!directRes.ok) {
        const directData = await directRes.json().catch(() => ({}));
        throw new Error(directData?.error || `Echec upload direct (${directRes.status})`);
      }

      setProgress(100);
      const fileUrl = `${apiBase}/api/storage${objectPath}`;
      onChange(fileUrl, {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });

      toast({ title: 'Fichier uploade', description: `Stocke a ${objectPath}` });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur upload',
        description: err?.message || 'Echec upload fichier',
      });
    } finally {
      setIsUploading(false);
    }

    e.target.value = '';
  };

  const hasUploadedFile = !!value && value.startsWith('/api/storage');
  const hasExternalUrl = !!value && !value.startsWith('/api/storage');

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block">{label}</label>

      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative border border-dashed rounded-xl p-4 cursor-pointer transition-all ${
          isUploading
            ? 'border-primary/40 bg-primary/5 cursor-wait'
            : 'border-white/[0.1] hover:border-primary/30 hover:bg-white/[0.02]'
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
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-xs text-primary font-bold">Upload... {progress}%</p>
            <div className="w-full bg-white/10 rounded-full h-1">
              <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : hasUploadedFile ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-400 truncate">{uploadedFileName || 'Fichier uploade'}</p>
              {uploadedFileSize > 0 && <p className="text-[10px] text-white/20">{formatBytes(uploadedFileSize)}</p>}
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(''); setUploadedFileName(''); setUploadedFileSize(0); setUploadedFileType(''); }}
              className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-rose-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-xs font-medium text-white/50">Cliquer pour uploader</p>
              {hint && <p className="text-[10px] text-white/20">{hint}</p>}
            </div>
            <Upload className="w-3.5 h-3.5 text-white/15 ml-auto" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link className="w-3 h-3 text-white/15 flex-shrink-0" />
        <input
          type="url"
          value={hasExternalUrl ? value : ''}
          onChange={e => { onChange(e.target.value); setUploadedFileName(''); setUploadedFileSize(0); }}
          placeholder="Ou coller une URL externe..."
          className="flex-1 bg-transparent border-b border-white/[0.06] py-1 text-[11px] text-white/30 focus:outline-none focus:border-white/[0.12] placeholder:text-white/10"
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
  };

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
        toast({ title: 'Supprime', description: 'Le produit a ete retire des produits actifs.' });
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
    const validOptions = form.priceOptions
      .filter(o => o.label.trim() && o.price.trim() && String(o.quantity ?? '').trim())
      .map(o => ({
        ...o,
        price: normalizePriceInput(o.price),
      }));
    if (validOptions.length === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Chaque option doit avoir un label, un prix et une quantite livree > 0.' });
      return;
    }

    const hasInvalidQuantity = validOptions.some(o => (parseInt(String(o.quantity ?? '0'), 10) || 0) <= 0);
    if (hasInvalidQuantity) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'La quantite livree doit etre superieure a 0 pour toutes les options.' });
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
        toast({ title: 'Modifie', description: 'Produit mis a jour.' });
      } else {
        await createMut.mutateAsync({ data: payload });
        toast({ title: 'Cree', description: 'Produit ajoute avec succes.' });
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
          <h1 className="text-2xl font-black text-white tracking-tight">Produits</h1>
          <p className="text-white/30 text-sm mt-0.5">Gerez votre catalogue de donnees</p>
        </div>
        <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/[0.12] transition-colors"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-white/[0.12] transition-colors cursor-pointer"
          >
            <option value="">Tous les types</option>
            {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-white/[0.12] transition-colors cursor-pointer"
          >
            <option value="">Tous les pays</option>
            {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-white/[0.12] transition-colors cursor-pointer"
          >
            <option value="active">Actifs</option>
            <option value="">Tous</option>
            <option value="inactive">Inactifs</option>
          </select>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterCountry(''); setFilterStatus('active'); }}
              className="px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="text-[11px] text-white/20">
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
          {activeFiltersCount > 0 && <span className="text-primary/60 ml-1">({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''})</span>}
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Produit</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Type / Pays</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Options de prix</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Ventes</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-[10px] text-white/25 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/15 mx-auto" /></td></tr>
              ) : filteredProducts.map(p => {
                const { type, country } = getTypeBadge(p.tags ?? []);
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.imageUrl ? <img src={resolveImageUrl(p.imageUrl)} className="w-full h-full object-cover" /> : <span className="text-white/15 text-lg">?</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white text-sm truncate max-w-[200px]">{p.name}</p>
                          {p.isFeatured && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary/70 rounded font-bold">PREMIUM</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        {type && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400/70 rounded w-fit font-bold">{type.label}</span>}
                        {country && <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.04] text-white/40 rounded w-fit">{country.label}</span>}
                        {!type && !country && <span className="text-[10px] text-rose-400/50">Non classe</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {p.priceOptions?.length > 0 ? (
                        <div className="space-y-0.5">
                          {p.priceOptions.map((opt: PriceOption, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-primary">{formatMoney(opt.price)}</span>
                              {opt.label && <span className="text-white/25">{opt.label}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="font-bold text-white text-sm">{formatMoney(p.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.stock > 0 ? (() => {
                        const remaining = Math.max(0, p.stock - (p.stockUsed ?? 0));
                        const pct = Math.max(0, Math.min(100, (remaining / p.stock) * 100));
                        const isLow = pct < 20;
                        const color = isLow ? 'bg-red-500' : pct < 50 ? 'bg-yellow-500' : 'bg-emerald-500';
                        return (
                          <div className="min-w-[80px]">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className={`font-bold ${isLow ? 'text-red-400' : 'text-white/60'}`}>{remaining.toLocaleString('fr-FR')}</span>
                              <span className="text-white/15">/{p.stock.toLocaleString('fr-FR')}</span>
                            </div>
                            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })() : <span className="text-white/15 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-white/30 text-sm">{p.totalSales}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-md font-bold ring-1 ${
                        p.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                          : 'bg-white/[0.04] text-white/30 ring-white/[0.08]'
                      }`}>
                        {p.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleOpenEdit(p)} className="p-1.5 rounded-lg text-blue-400/60 hover:bg-blue-500/10 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-rose-400/60 hover:bg-rose-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-14 text-center">
                    <Search className="w-8 h-8 text-white/[0.05] mx-auto mb-2" />
                    <p className="text-sm text-white/20">
                      {products.length === 0 ? 'Aucun produit' : 'Aucun produit ne correspond aux filtres'}
                    </p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => { setSearch(''); setFilterType(''); setFilterCountry(''); setFilterStatus('active'); }}
                        className="text-xs text-primary/50 hover:text-primary mt-1 transition-colors"
                      >
                        Reinitialiser les filtres
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="w-full max-w-2xl bg-[hsl(240,10%,7%)] rounded-2xl relative z-10 max-h-[90vh] overflow-y-auto border border-white/[0.08] shadow-2xl">
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center sticky top-0 bg-[hsl(240,10%,7%)]/95 backdrop-blur-md z-10">
              <h2 className="text-lg font-black text-white">{editingId ? 'Modifier Produit' : 'Nouveau Produit'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3">
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Classement Boutique</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Type *</label>
                    <select
                      required
                      value={form.productType}
                      onChange={e => setForm({ ...form, productType: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.15] transition-colors"
                    >
                      <option value="">Choisir type</option>
                      {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Pays *</label>
                    <select
                      required
                      value={form.country}
                      onChange={e => setForm({ ...form, country: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.15] transition-colors"
                    >
                      <option value="">Choisir pays</option>
                      {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                {form.productType && form.country && (
                  <p className="text-[11px] text-primary/50 bg-primary/8 px-3 py-1.5 rounded-lg">
                    Apparaitra dans {PRODUCT_TYPES.find(t => t.value === form.productType)?.label} &rarr; {COUNTRIES.find(c => c.value === form.country)?.label}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Nom du produit</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors" placeholder="Ex: NUMLIST France — 500K numeros" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">Description</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors min-h-[80px]" placeholder="Description detaillee du produit..." />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Options de prix</label>
                    <button type="button" onClick={addPriceOption} className="flex items-center gap-1 text-[11px] text-primary/50 hover:text-primary font-medium transition-colors">
                      <PlusCircle size={12} /> Ajouter
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {form.priceOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <GripVertical size={12} className="text-white/10 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Label (ex: 10K contacts)"
                          value={opt.label}
                          onChange={e => updatePriceOption(idx, 'label', e.target.value)}
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors"
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Lignes livrees"
                          title="Nombre de LIGNES que le client recoit (pas le stock total !)"
                          value={opt.quantity}
                          onChange={e => updatePriceOption(idx, 'quantity', e.target.value)}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          className="w-24 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Prix"
                          value={opt.price}
                          onChange={e => updatePriceOption(idx, 'price', e.target.value)}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => removePriceOption(idx)}
                          disabled={form.priceOptions.length <= 1}
                          className="text-rose-400/40 hover:text-rose-400 disabled:opacity-10 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <p className="text-[10px] text-white/15 pl-5">Label / Nb lignes livrees au client / Prix</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.05]">
                <label className="text-[10px] font-semibold text-white/25 uppercase tracking-wider block mb-1.5">
                  Stock total uploade
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                    className="w-44 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors"
                    placeholder="ex: 25000"
                  />
                  {form.stock && (
                    <span className="text-xs text-white/25">
                      = <span className="text-white/50 font-bold">{parseInt(form.stock).toLocaleString('fr-FR')}</span> enregistrements
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/15 mt-1">Chaque commande deduit automatiquement la quantite achetee</p>
              </div>

              <div className="space-y-4 pt-3 border-t border-white/[0.05]">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Fichiers</p>
                <FileUploadButton
                  label="Fichier de stock (donnees a distribuer)"
                  value={form.fileUrl}
                  onChange={(v, metadata) => setForm(prev => ({
                    ...prev,
                    fileUrl: v,
                    fileName: metadata?.fileName || '',
                    fileType: metadata?.fileType || '',
                    fileSize: metadata?.fileSize || 0,
                  }))}
                  accept=".txt,.csv"
                  icon={<Upload className="w-4 h-4 text-white/25" />}
                  hint="TXT ou CSV — 1 enregistrement par ligne — max 50 MB"
                  initialFileName={form.fileName}
                  initialFileSize={form.fileSize}
                  initialFileType={form.fileType}
                />
                <p className="text-[10px] text-amber-400/40 bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
                  A chaque commande, un fichier est genere avec le nombre d'enregistrements commandes, puis livre au client. Le stock diminue a chaque vente.
                </p>
                <FileUploadButton
                  label="Image produit (optionnelle)"
                  value={form.imageUrl}
                  onChange={v => setForm(prev => ({ ...prev, imageUrl: v }))}
                  accept="image/*"
                  icon={<ImageIcon className="w-4 h-4 text-white/25" />}
                  hint="JPG, PNG, WebP — max 5 MB"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.05]">
                {[
                  { key: 'isActive', label: 'Actif', desc: 'Visible en boutique' },
                  { key: 'isFeatured', label: 'Premium', desc: 'Badge PREMIUM' },
                  { key: 'isBestSeller', label: 'Best Seller', desc: 'Badge BEST SELLER' },
                  { key: 'isNew', label: 'Nouveau', desc: 'Badge NOUVEAU' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-2.5 p-3 bg-white/[0.02] rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]">
                    <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="w-4 h-4 accent-primary rounded" />
                    <div>
                      <p className="text-white/70 font-medium text-xs">{label}</p>
                      <p className="text-white/15 text-[10px]">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {createMut.isPending || updateMut.isPending ? 'Enregistrement...' : (editingId ? 'Mettre a jour' : 'Creer le produit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
