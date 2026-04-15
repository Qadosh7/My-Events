import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar as CalendarIcon, Clock, ChevronRight, Search, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Dashboard() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });

  const fetchMeetings = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar reuniões');
    } else {
      setMeetings(data || []);
    }
    setLoading(false);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Minhas Reuniões</h1>
          <p className="text-slate-500">Gerencie suas pautas e cronogramas</p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Reunião
            </Button>
          </DialogTrigger>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar reuniões..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => (
            <Link key={meeting.id} to={`/meeting/${meeting.id}`}>
              <Card className="group hover:shadow-md transition-all border-slate-200 overflow-hidden h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-primary"
                        onClick={(e) => handleDuplicateMeeting(meeting, e)}
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-destructive"
                        onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="mt-4 line-clamp-1">{meeting.title}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {meeting.description || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 flex-1">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4" />
                      {format(new Date(meeting.date), "dd 'de' MMM", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {format(new Date(meeting.date), "HH:mm")}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-6 flex justify-end">
                  <div className="text-primary font-medium text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver detalhes
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhuma reunião encontrada</h3>
          <p className="text-slate-500 mt-1">Crie sua primeira reunião para começar.</p>
          <Button className="mt-6 gap-2" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Reunião
          </Button>
        </div>
      )}
    </div>
  );
}
