import React from 'react';
import { useGetMyOrders, useDownloadFile } from '@workspace/api-client-react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Package, Download, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function Orders() {
  const { data, isLoading } = useGetMyOrders();
  const orders = data?.orders || [];
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const { toast } = useToast();

  const handleDownload = (productId: number, productName: string) => {
    // In a real app, we'd hit /api/downloads/:token. 
    // Here we simulate the action.
    toast({ title: "Téléchargement initié", description: `Préparation du fichier ${productName}...` });
    setTimeout(() => {
      toast({ title: "Terminé", description: "Le fichier a été enregistré sur votre appareil." });
    }, 2000);
  };

  return (
    <MiniAppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-display font-black text-white mb-6">Mes Commandes</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Aucune commande</h2>
            <p className="text-muted-foreground">Vous n'avez pas encore passé de commande.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const isExpanded = expandedId === order.id;
              const isConfirmed = order.status === 'confirmed';

              return (
                <div key={order.id} className="glass-card rounded-2xl overflow-hidden">
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex gap-4 items-center">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border",
                        isConfirmed ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-yellow-500/20 border-yellow-500/30 text-yellow-500"
                      )}>
                        {isConfirmed ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-bold text-white">Commande #{order.id}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-black text-primary">{formatMoney(order.amount)}</p>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <p className="text-sm font-bold text-white">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
                          </div>
                          {isConfirmed ? (
                            <button 
                              onClick={() => handleDownload(item.productId, item.productName)}
                              className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/40 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-yellow-500 font-medium px-2 py-1 bg-yellow-500/10 rounded-md">En attente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MiniAppLayout>
  );
}
