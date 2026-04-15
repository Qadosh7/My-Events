import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Meeting, Topic, Break, AgendaItem, TopicParticipant, MeetingExecutionLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Clock, User, Users, Trash2, GripVertical, 
  Coffee, Utensils, Save, ArrowLeft, MoreVertical,
  Check, X, Pencil, Calendar, Share2, FileText, PlayCircle,
  Download, Send, CalendarDays, AlertCircle
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';

import { analyzeMeetingPerformance } from '@/services/aiService';

// --- Sortable Item Component ---

interface SortableItemProps {
  item: AgendaItem;
  onDelete: (id: string, type: 'topic' | 'break') => void;
  onUpdate: (item: AgendaItem) => void;
  onAddParticipant: (topicId: string, name: string) => void;
  onRemoveParticipant: (participantId: string) => void;
}

function SortableAgendaItem({ item, onDelete, onUpdate, onAddParticipant, onRemoveParticipant }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item);
  const [newParticipant, setNewParticipant] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const handleSave = () => {
    onUpdate(editValue);
    setIsEditing(false);
  };

  const isTopic = item.itemType === 'topic';

  return (
    <div ref={setNodeRef} style={style} className={`group ${isDragging ? 'opacity-50' : ''}`}>
      <Card className={`border-border shadow-none transition-all ${item.itemType === 'break' ? 'bg-slate-50/50 border-dashed' : 'bg-white'}`}>
        <CardContent className="p-3 px-4">
          <div className="flex items-center gap-3">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400">
              <GripVertical className="w-4 h-4" />
            </div>

            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3 py-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Título</Label>
                      <Input 
                        className="h-8 text-sm"
                        value={editValue.title} 
                        onChange={(e) => setEditValue({ ...editValue, title: e.target.value } as any)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Duração (minutos)</Label>
                      <Input 
                        className="h-8 text-sm"
                        type="number"
                        value={editValue.duration_minutes} 
                        onChange={(e) => setEditValue({ ...editValue, duration_minutes: parseInt(e.target.value) || 0 } as any)}
                      />
                    </div>
                  </div>
                  {isTopic && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Apresentador</Label>
                      <Input 
                        className="h-8 text-sm"
                        value={(editValue as Topic).presenter_name || ''} 
                        onChange={(e) => setEditValue({ ...editValue, presenter_name: e.target.value } as any)}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-7 flex items-center justify-center text-[11px] font-bold text-primary bg-primary/5 rounded-md border border-primary/10">
                        {item.duration_minutes} min
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground leading-none">
                            {item.itemType === 'topic' ? item.title : (item as any).title}
                          </h3>
                          {!isTopic && (
                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-100">
                              {item.type === 'almoço' ? <Utensils className="w-2.5 h-2.5 mr-1" /> : <Coffee className="w-2.5 h-2.5 mr-1" />}
                              {item.type}
                            </Badge>
                          )}
                        </div>
                        {isTopic && (item as Topic).description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{(item as Topic).description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id, item.itemType)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isTopic && (
                    <div className="flex flex-wrap items-center gap-4 pt-2 mt-2 border-t border-slate-50">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="font-semibold text-foreground">Apresentador:</span>
                        {(item as Topic).presenter_name || 'Não definido'}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span className="font-semibold text-foreground">Participantes:</span>
                        <div className="flex flex-wrap gap-1">
                          {(item as Topic).participants?.map((p) => (
                            <Badge key={p.id} variant="outline" className="h-5 text-[10px] px-1.5 pr-1 gap-1 group/badge border-slate-200">
                              {p.participant_name}
                              <button 
                                onClick={() => onRemoveParticipant(p.id)}
                                className="hover:text-destructive transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </Badge>
                          ))}
                          <div className="flex items-center ml-1">
                            <Input 
                              placeholder="Add..." 
                              className="h-5 w-16 text-[10px] px-1.5 py-0 border-dashed bg-transparent"
                              value={newParticipant}
                              onChange={(e) => setNewParticipant(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newParticipant.trim()) {
                                  onAddParticipant(item.id, newParticipant.trim());
                                  setNewParticipant('');
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Page Component ---

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<MeetingExecutionLog[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { isPro, loading: subLoading } = useSubscription();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchMeetingData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      // Fetch topics and breaks
      const [topicsRes, breaksRes] = await Promise.all([
        supabase.from('topics').select('*, topic_participants(*)').eq('meeting_id', id),
        supabase.from('breaks').select('*').eq('meeting_id', id)
      ]);

      const topics: AgendaItem[] = (topicsRes.data || []).map(t => ({ ...t, itemType: 'topic', participants: t.topic_participants }));
      const breaks: AgendaItem[] = (breaksRes.data || []).map(b => ({ ...b, itemType: 'break', title: b.type === 'almoço' ? 'Almoço' : 'Pausa' }));

      const allItems = [...topics, ...breaks].sort((a, b) => a.order_index - b.order_index);
      setItems(allItems);

      // Fetch logs
      const { data: logsData } = await supabase
        .from('meeting_execution_logs')
        .select('*')
        .eq('meeting_id', id)
        .order('started_at');
      
      setExecutionLogs(logsData || []);
    } catch (error) {
      toast.error('Erro ao carregar dados da reunião');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchMeetingData();
  }, [fetchMeetingData]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order_index for all items
        const updatedItems = newItems.map((item, index) => {
          return Object.assign({}, item, { order_index: index }) as AgendaItem;
        });

        // Trigger auto-save of order
        saveItemsOrder(updatedItems);
        
        return updatedItems;
      });
    }
  };

  const saveItemsOrder = async (updatedItems: AgendaItem[]) => {
    setIsSaving(true);
    try {
      const topicUpdates = updatedItems
        .filter(i => i.itemType === 'topic')
        .map(i => ({ id: i.id, order_index: i.order_index }));
      
      const breakUpdates = updatedItems
        .filter(i => i.itemType === 'break')
        .map(i => ({ id: i.id, order_index: i.order_index }));

      if (topicUpdates.length > 0) {
        await supabase.from('topics').upsert(topicUpdates.map(t => ({ ...t, meeting_id: id })));
      }
      if (breakUpdates.length > 0) {
        await supabase.from('breaks').upsert(breakUpdates.map(b => ({ ...b, meeting_id: id })));
      }
    } catch (error) {
      toast.error('Erro ao salvar ordem');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = async (type: 'topic' | 'break') => {
    if (!id) return;
    const orderIndex = items.length;

    const topicsCount = items.filter(i => i.itemType === 'topic').length;
    if (type === 'topic' && !isPro && topicsCount >= 10) {
      setUpgradeFeature('tópicos ilimitados');
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      if (type === 'topic') {
        const { data, error } = await supabase
          .from('topics')
          .insert([{
            meeting_id: id,
            title: 'Novo Tópico',
            duration_minutes: 15,
            order_index: orderIndex
          }])
          .select()
          .single();
        
        if (error) throw error;
        setItems([...items, { ...data, itemType: 'topic', participants: [] }]);
      } else {
        const { data, error } = await supabase
          .from('breaks')
          .insert([{
            meeting_id: id,
            type: 'pausa',
            duration_minutes: 10,
            order_index: orderIndex
          }])
          .select()
          .single();
        
        if (error) throw error;
        setItems([...items, { ...data, itemType: 'break', title: 'Pausa' }]);
      }
      toast.success('Item adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar item');
    }
  };

  const handleDeleteItem = async (itemId: string, type: 'topic' | 'break') => {
    try {
      const table = type === 'topic' ? 'topics' : 'breaks';
      const { error } = await supabase.from(table).delete().eq('id', itemId);
      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      toast.success('Item removido');
    } catch (error) {
      toast.error('Erro ao remover item');
    }
  };

  const handleUpdateItem = async (updatedItem: AgendaItem) => {
    try {
      const table = updatedItem.itemType === 'topic' ? 'topics' : 'breaks';
      const { itemType, participants, ...dataToUpdate } = updatedItem as any;
      
      // If it's a break, we need to ensure 'type' is set correctly if title changed
      if (updatedItem.itemType === 'break') {
        const breakItem = updatedItem as any;
        dataToUpdate.type = breakItem.title?.toLowerCase().includes('almoço') ? 'almoço' : 'pausa';
      }

      const { error } = await supabase.from(table).update(dataToUpdate).eq('id', updatedItem.id);
      if (error) throw error;

      setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
      toast.success('Atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleShare = async () => {
    if (!id || !shareEmail) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('shared_meetings')
        .insert({
          meeting_id: id,
          owner_user_id: user.id,
          shared_with_email: shareEmail,
          permission: sharePermission
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuário já tem acesso a esta reunião');
        } else {
          throw error;
        }
      } else {
        toast.success(`Reunião compartilhada com ${shareEmail}`);
        setShareEmail('');
        setIsShareDialogOpen(false);
      }
    } catch (error) {
      console.error('Error sharing meeting:', error);
      toast.error('Erro ao compartilhar reunião');
    }
  };

  const exportToPDF = () => {
    if (!meeting) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(meeting.title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Data: ${format(new Date(meeting.date), "dd/MM/yyyy")}`, 14, 30);
    doc.text(`Gerado por: Agenda Inteligente de Reuniões`, 14, 35);
    
    if (meeting.description) {
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85); // slate-700
      const splitDesc = doc.splitTextToSize(meeting.description, pageWidth - 28);
      doc.text(splitDesc, 14, 45);
    }
    
    // Agenda Table
    const tableData = items.map((item, index) => {
      const isTopic = item.itemType === 'topic';
      return [
        index + 1,
        item.title,
        isTopic ? (item as Topic).presenter_name || '-' : 'Pausa',
        `${item.duration_minutes} min`,
        isTopic ? (item as Topic).participants?.map(p => p.participant_name).join(', ') || '-' : '-'
      ];
    });
    
    autoTable(doc, {
      startY: meeting.description ? 60 : 45,
      head: [['#', 'Tópico/Pausa', 'Responsável', 'Duração', 'Participantes']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      margin: { top: 40 },
    });
    
    doc.save(`Agenda_${meeting.title.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const exportToText = () => {
    if (!meeting) return;
    
    let text = `AGENDA DE REUNIÃO: ${meeting.title}\n`;
    text += `Data: ${format(new Date(meeting.date), "dd/MM/yyyy")}\n`;
    if (meeting.description) text += `Descrição: ${meeting.description}\n`;
    text += `\nPAUTA:\n`;
    
    items.forEach((item, index) => {
      text += `${index + 1}. ${item.title} (${item.duration_minutes} min)\n`;
      if (item.itemType === 'topic') {
        if ((item as Topic).presenter_name) text += `   Responsável: ${(item as Topic).presenter_name}\n`;
        if ((item as Topic).participants?.length) {
          text += `   Participantes: ${(item as Topic).participants?.map(p => p.participant_name).join(', ')}\n`;
        }
      }
      text += `\n`;
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Agenda_${meeting.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    toast.success('Texto exportado com sucesso!');
  };

  const exportToGoogleCalendar = () => {
    if (!meeting) return;
    
    const startTime = new Date(meeting.date);
    const endTime = addMinutes(startTime, totalDuration);
    
    const formatGCalDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
    
    const details = `AGENDA:\n${items.map((item, i) => `${i+1}. ${item.title} (${item.duration_minutes} min)`).join('\n')}\n\n${meeting.description || ''}`;
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: meeting.title,
      dates: `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`,
      details: details,
      location: 'Online / Meeting Room',
    });
    
    window.open(`https://www.google.com/calendar/render?${params.toString()}`, '_blank');
    toast.success('Abrindo Google Calendar...');
  };

  const handleAnalyzePerformance = async () => {
    if (!meeting || executionLogs.length === 0) return;
    setIsAnalyzing(true);
    try {
      const topics = items.filter(i => i.itemType === 'topic') as Topic[];
      const breaks = items.filter(i => i.itemType === 'break') as Break[];
      const analysis = await analyzeMeetingPerformance(meeting.title, executionLogs, topics, breaks);
      setAiAnalysis(analysis);
    } catch (error) {
      toast.error('Erro ao analisar performance');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddParticipant = async (topicId: string, name: string) => {
    try {
      const { data, error } = await supabase
        .from('topic_participants')
        .insert([{ topic_id: topicId, participant_name: name }])
        .select()
        .single();
      
      if (error) throw error;

      setItems(items.map(item => {
        if (item.id === topicId && item.itemType === 'topic') {
          return {
            ...item,
            participants: [...(item.participants || []), data]
          };
        }
        return item;
      }));
    } catch (error) {
      toast.error('Erro ao adicionar participante');
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase.from('topic_participants').delete().eq('id', participantId);
      if (error) throw error;

      setItems(items.map(item => {
        if (item.itemType === 'topic' && item.participants) {
          return {
            ...item,
            participants: item.participants.filter(p => p.id !== participantId)
          };
        }
        return item;
      }));
    } catch (error) {
      toast.error('Erro ao remover participante');
    }
  };

  const totalDuration = items.reduce((acc, item) => acc + item.duration_minutes, 0);
  const meetingStartTime = meeting ? new Date(meeting.date) : new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!meeting) return null;

  return (
    <div className="space-y-6">
      <div className="meeting-info flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="title-area">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{meeting.title}</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">{meeting.description || 'Sem descrição definida para esta reunião.'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => {
              if (!isPro) {
                setUpgradeFeature('compartilhamento de reuniões');
                setIsUpgradeModalOpen(true);
              } else {
                setIsShareDialogOpen(true);
              }
            }}
          >
            <Share2 className="w-4 h-4" /> Compartilhar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => {
                  if (!isPro) {
                    setUpgradeFeature('exportação PDF profissional');
                    setIsUpgradeModalOpen(true);
                  } else {
                    exportToPDF();
                  }
                }} 
                className="gap-2"
              >
                <FileText className="w-4 h-4" /> PDF Profissional
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToText} className="gap-2">
                <FileText className="w-4 h-4" /> Texto Simples
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToGoogleCalendar} className="gap-2">
                <CalendarDays className="w-4 h-4" /> Google Calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/meeting/${id}/execute`)}>
            <PlayCircle className="w-4 h-4" /> Iniciar Reunião
          </Button>

          <div className="flex items-center gap-2 ml-2 border-l pl-4">
            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mr-2">
                <Save className="w-3 h-3 animate-pulse" />
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleAddItem('break')}>
              <Coffee className="w-4 h-4" />
              Pausa
            </Button>
            <Button size="sm" className="gap-2" onClick={() => handleAddItem('topic')}>
              <Plus className="w-4 h-4" />
              Tópico
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {executionLogs.length > 0 && (
            <Card className="border-indigo-100 bg-indigo-50/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                    Relatório de Performance
                  </CardTitle>
                  <p className="text-sm text-slate-500">Análise baseada na última execução</p>
                </div>
                {!aiAnalysis && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      if (!isPro) {
                        setUpgradeFeature('análise de performance com IA');
                        setIsUpgradeModalOpen(true);
                      } else {
                        handleAnalyzePerformance();
                      }
                    }}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? 'Analisando...' : 'Análise com IA'}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Eficiência</p>
                    <p className="text-2xl font-black text-indigo-600">
                      {Math.round((executionLogs.reduce((acc, l) => acc + l.planned_duration, 0) / executionLogs.reduce((acc, l) => acc + (l.actual_duration || l.planned_duration), 0)) * 100)}%
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Planejado</p>
                    <p className="text-2xl font-black text-slate-700">
                      {executionLogs.reduce((acc, l) => acc + l.planned_duration, 0)}m
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Real</p>
                    <p className="text-2xl font-black text-slate-700">
                      {executionLogs.reduce((acc, l) => acc + (l.actual_duration || 0), 0)}m
                    </p>
                  </div>
                </div>

                {aiAnalysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-4 border-t border-indigo-100"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-indigo-900 mb-1">Resumo da IA</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{aiAnalysis.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-indigo-900 mb-2">Padrões Identificados</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.patterns.map((p: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">•</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-indigo-900 mb-2">Sugestões de Melhoria</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.suggestions.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-indigo-400 mt-0.5">→</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              Cronograma da Reunião
              <Badge variant="secondary" className="font-mono">
                {Math.floor(totalDuration / 60)}h {totalDuration % 60}min total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item, index) => {
                    // Calculate start time for this item
                    const previousDuration = items.slice(0, index).reduce((acc, i) => acc + i.duration_minutes, 0);
                    const itemStartTime = addMinutes(meetingStartTime, previousDuration);
                    
                    return (
                      <div key={item.id} className="relative">
                        <div className="absolute -left-16 top-6 text-xs font-mono text-slate-400 w-12 text-right">
                          {format(itemStartTime, "HH:mm")}
                        </div>
                        <SortableAgendaItem 
                          item={item} 
                          onDelete={handleDeleteItem}
                          onUpdate={handleUpdateItem}
                          onAddParticipant={handleAddParticipant}
                          onRemoveParticipant={handleRemoveParticipant}
                        />
                      </div>
                    );
                  })}
                  
                  {items.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-slate-500">Nenhum tópico ou pausa adicionado ainda.</p>
                      <div className="flex justify-center gap-4 mt-4">
                        <Button variant="outline" size="sm" onClick={() => handleAddItem('topic')}>
                          Adicionar Tópico
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAddItem('break')}>
                          Adicionar Pausa
                        </Button>
                      </div>
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className="relative">
                      <div className="absolute -left-16 top-2 text-xs font-mono text-primary w-12 text-right font-bold">
                        {format(addMinutes(meetingStartTime, totalDuration), "HH:mm")}
                      </div>
                      <div className="h-px bg-slate-200 w-full mt-4" />
                      <p className="text-center text-xs text-slate-400 mt-2 uppercase tracking-widest">Fim da Reunião</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Resumo do Tempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Início</span>
                <span className="font-mono font-medium">{format(meetingStartTime, "HH:mm")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Tópicos</span>
                <span className="font-mono font-medium">
                  {items.filter(i => i.itemType === 'topic').reduce((acc, i) => acc + i.duration_minutes, 0)} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Pausas</span>
                <span className="font-mono font-medium">
                  {items.filter(i => i.itemType === 'break').reduce((acc, i) => acc + i.duration_minutes, 0)} min
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-primary">{totalDuration} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Previsão de Término</span>
                <span className="font-mono font-bold text-slate-900">
                  {format(addMinutes(meetingStartTime, totalDuration), "HH:mm")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Dicas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>• Arraste os itens para reordenar a pauta.</p>
              <p>• Clique no ícone de lápis para editar tempo e título.</p>
              <p>• Adicione participantes pressionando Enter no campo de texto.</p>
              <p>• As alterações são salvas automaticamente.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        feature={upgradeFeature} 
      />

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email do usuário</Label>
              <Input 
                placeholder="email@exemplo.com" 
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissão</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="permission" 
                    checked={sharePermission === 'view'} 
                    onChange={() => setSharePermission('view')}
                  />
                  <span className="text-sm ml-2">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="permission" 
                    checked={sharePermission === 'edit'} 
                    onChange={() => setSharePermission('edit')}
                  />
                  <span className="text-sm ml-2">Editar</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleShare} className="w-full gap-2">
              <Send className="w-4 h-4" /> Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
