import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erro ao criar sessão de checkout');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap className="w-32 h-32" />
          </div>
          <DialogHeader>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest mb-4 w-fit">
              <Zap className="w-3 h-3" />
              Upgrade para Pro
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight leading-none">
              {feature ? `Desbloqueie ${feature}` : 'Leve suas reuniões para o próximo nível'}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-lg mt-4">
              O plano Pro oferece tudo o que você precisa para uma gestão profissional.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-8 bg-white">
          <ul className="space-y-4 mb-8">
            {[
              'Reuniões ilimitadas',
              'IA completa e resumos automáticos',
              'Exportação PDF profissional',
              'Compartilhamento ilimitado',
              'Relatórios de performance detalhados'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                <CheckCircle2 className="w-5 h-5 text-primary" /> {item}
              </li>
            ))}
          </ul>
          
          <div className="flex flex-col gap-3">
            <Button size="lg" className="h-14 text-lg font-bold shadow-xl shadow-primary/20" onClick={handleUpgrade} disabled={loading}>
              {loading ? 'Processando...' : 'Assinar Plano Pro - R$ 49/mês'}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Continuar no plano gratuito
            </Button>
          </div>
          
          <p className="text-center text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-bold">
            Cancelamento fácil a qualquer momento
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
