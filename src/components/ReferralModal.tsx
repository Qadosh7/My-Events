import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function ReferralModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/register?ref=${user?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Convide um amigo</DialogTitle>
          <DialogDescription>
            Compartilhe o Agenda Inteligente com seus colegas e ajude-os a ter reuniões mais produtivas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Ganhe benefícios</p>
              <p className="text-xs text-slate-500">Em breve: ganhe reuniões extras por cada indicação aceita!</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Seu Link de Indicação</Label>
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={referralLink} 
                className="bg-slate-50 font-mono text-xs"
              />
              <Button size="icon" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="w-full">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
