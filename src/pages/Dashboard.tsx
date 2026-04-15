import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar as CalendarIcon, Clock, ChevronRight, Search, Trash2, Copy, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import { AlertCircle, Zap } from 'lucide-react';

interface MeetingWithShare extends Meeting {
  is_shared?: boolean;
  permission?: 'view' | 'edit';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
  const { isPro, loading: subLoading } = useSubscription();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const fetchMeetings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch owned meetings
      const { data: ownedData, error: ownedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (ownedError) throw ownedError;

      // Fetch shared meetings
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_meetings')
        .select('permission, meetings(*)')
        .eq('shared_with_email', user.email);

      if (sharedError) throw sharedError;

      const sharedMeetings: MeetingWithShare[] = (sharedData || [])
        .filter(s => s.meetings)
        .map(s => ({
          ...(s.meetings as any),
          is_shared: true,
          permission: s.permission
        }));

      const allMeetings = [
        ...(ownedData || []),
        ...sharedMeetings
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMeetings(allMeetings);
    } catch (error) {
      toast.error('Erro ao carregar reuniões');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [user]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { data, error } = await supabase
      .from('meetings')
      .insert([
        {
          user_id: user.id,
          title: newMeeting.title,
          description: newMeeting.description,
          date: new Date(newMeeting.date).toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar reunião');
    } else {
      toast.success('Reunião criada com sucesso!');
      setIsCreateModalOpen(false);
      setNewMeeting({ title: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
      fetchMeetings();
    }
  };

  const handleDeleteMeeting = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Tem certeza que deseja excluir esta reunião?')) return;

    const { error } = await supabase.from('meetings').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao excluir reunião');
    } else {
      toast.success('Reunião excluída');
      fetchMeetings();
    }
  };

  const handleDuplicateMeeting = async (meeting: Meeting, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // 1. Duplicate meeting
      const { data: newMeetingData, error: meetingError } = await supabase
        .from('meetings')
        .insert([{
          user_id: user?.id,
          title: `${meeting.title} (Cópia)`,
          description: meeting.description,
          date: meeting.date
        }])
        .select()
        .single();

      if (meetingError) throw meetingError;

      // 2. Fetch topics and breaks
      const [topicsRes, breaksRes] = await Promise.all([
        supabase.from('topics').select('*, topic_participants(*)').eq('meeting_id', meeting.id),
        supabase.from('breaks').select('*').eq('meeting_id', meeting.id)
      ]);

      // 3. Duplicate topics and their participants
      if (topicsRes.data) {
        for (const topic of topicsRes.data) {
          const { data: newTopic, error: topicError } = await supabase
            .from('topics')
            .insert([{
              meeting_id: newMeetingData.id,
              title: topic.title,
              description: topic.description,
              duration_minutes: topic.duration_minutes,
              order_index: topic.order_index,
              presenter_name: topic.presenter_name
            }])
            .select()
            .single();

          if (topicError) throw topicError;

          if (topic.topic_participants && topic.topic_participants.length > 0) {
            await supabase.from('topic_participants').insert(
              topic.topic_participants.map((p: any) => ({
                topic_id: newTopic.id,
                participant_name: p.participant_name
              }))
            );
          }
        }
      }

      // 4. Duplicate breaks
      if (breaksRes.data) {
        await supabase.from('breaks').insert(
          breaksRes.data.map(b => ({
            meeting_id: newMeetingData.id,
            type: b.type,
            duration_minutes: b.duration_minutes,
            order_index: b.order_index
          }))
        );
      }

      toast.success('Reunião duplicada com sucesso!');
      fetchMeetings();
    } catch (error) {
      toast.error('Erro ao duplicar reunião');
      console.error(error);
    }
  };

  const filteredMeetings = meetings.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ownedMeetingsCount = meetings.filter(m => !m.is_shared).length;
  const isAtLimit = !isPro && ownedMeetingsCount >= 5;

  const handleOpenCreateModal = () => {
    if (isAtLimit) {
      setUpgradeFeature('reuniões ilimitadas');
      setIsUpgradeModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {!isPro && ownedMeetingsCount >= 4 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">
              Você usou {ownedMeetingsCount} de 5 reuniões do plano gratuito. 
              {ownedMeetingsCount === 5 ? ' Você atingiu o limite.' : ' Faça o upgrade para criar reuniões ilimitadas.'}
            </p>
          </div>
          <Button variant="outline" size="sm" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => { setUpgradeFeature('reuniões ilimitadas'); setIsUpgradeModalOpen(true); }}>
            Fazer Upgrade
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="title-area">
          <h1 className="text-2xl font-bold text-foreground">Minhas Reuniões</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas pautas e cronogramas de forma eficiente.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reuniões..."
              className="pl-10 w-64 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <Button className="gap-2 shadow-sm" onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4" />
              Nova Reunião
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Reunião</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes básicos da sua reunião.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateMeeting} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Alinhamento Semanal"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Breve resumo da reunião"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data e Hora</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Reunião</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        feature={upgradeFeature} 
      />

      {meetings.length > 0 && !loading && !meetings.some(m => new Date(m.date) > new Date()) && meetings.find(m => !m.is_shared) && (
        <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Copy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Deseja duplicar sua última reunião?</p>
              <p className="text-sm text-slate-500">Você não tem reuniões futuras agendadas. Comece rápido duplicando a pauta anterior.</p>
            </div>
          </div>
          <Button onClick={(e) => handleDuplicateMeeting(meetings.find(m => !m.is_shared)!, e)} className="gap-2 shadow-lg shadow-primary/20">
            <Copy className="w-4 h-4" /> Duplicar Agora
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white border border-border animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting) => (
            <Link key={meeting.id} to={`/meeting/${meeting.id}`}>
              <Card className="group hover:border-primary/50 transition-all border-border shadow-none overflow-hidden h-full flex flex-col">
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {meeting.title}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(meeting.date), "dd MMM, yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(meeting.date), "HH:mm")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {meeting.is_shared ? (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {meeting.permission === 'edit' ? 'Editor' : 'Leitor'}
                        </Badge>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => handleDuplicateMeeting(meeting, e)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {meeting.description || 'Sem descrição adicional para esta reunião.'}
                  </p>
                </CardContent>
                <CardFooter className="px-5 py-3 bg-slate-50/50 border-t border-border flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                      {user?.email?.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {meeting.is_shared ? 'Compartilhada' : 'Proprietário'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-border">
          <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Nenhuma reunião encontrada</h3>
          <p className="text-muted-foreground text-sm mt-1">Crie sua primeira reunião para começar a organizar sua pauta.</p>
          <Button className="mt-6 gap-2" onClick={handleOpenCreateModal}>
            <Plus className="w-4 h-4" />
            Nova Reunião
          </Button>
        </div>
      )}
    </div>
  );
}
