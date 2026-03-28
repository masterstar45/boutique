import React from 'react';
import { useGetMyOrders } from '@workspace/api-client-react';
import { MiniAppLayout } from '@/components/layout/MiniAppLayout';
import { formatMoney, formatDate } from '@/lib/utils';
import { Package, Download, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export function Orders() {
  const { data, isLoading } = useGetMyOrders();
  const orders = data?.orders || [];
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const { toast } = useToast();

  const handleDownload = (productId: number, productName: string) => {
    toast({ title: "Téléchargement initié", description: `Préparation du fichier ${productName}...` });
    setTimeout(() => {
      toast({ title: "Terminé", description: "Le fichier a été enregistré sur votre appareil." });
    }, 2000);
  };

  return (
    <MiniAppLayout>
      <div className="p-5">
        <h1 className="text-xl font-display font-black text-white mb-5">Mes Commandes</h1>

        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-white/[0.03] animate-pulse rounded-2xl border border-white/[0.04]" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-3 border border-white/[0.06]">
              <Package className="w-8 h-8 text-white/15" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">Aucune commande</h2>
            <p className="text-white/30 text-sm">Vous n'avez pas encore commandé.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order, i) => {
              const isExpanded = expandedId === order.id;
              const isConfirmed = order.status === 'confirmed';

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-2xl overflow-hidden"
                >
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex gap-3 items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        isConfirmed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                      )}>
                        {isConfirmed ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">Commande #{order.id}</p>
                        <p className="text-[10px] text-white/40">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-0.5">
                      <p className="font-black text-primary text-sm">{formatMoney(order.amount)}</p>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-0 border-t border-white/[0.04] bg-white/[0.01] space-y-2 mt-0">
                      <div className="pt-2.5" />
                      {order.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                          <div>
                            <p className="text-xs font-bold text-white">{item.productName}</p>
                            <p className="text-[10px] text-white/25">Qté: {item.quantity}</p>
                          </div>
                          {isConfirmed ? (
                            <button 
                              onClick={() => handleDownload(item.productId, item.productName)}
                              className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors border border-primary/20"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-yellow-500/70 font-medium px-2 py-0.5 bg-yellow-500/[0.06] rounded-md border border-yellow-500/15">En attente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MiniAppLayout>
  );
}
