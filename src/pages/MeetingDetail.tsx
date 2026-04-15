import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Meeting, Topic, Break, AgendaItem, TopicParticipant } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Clock, User, Users, Trash2, GripVertical, 
  Coffee, Utensils, Save, ArrowLeft, MoreVertical,
  Check, X, Pencil, Calendar
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
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
      <Card className={`mb-4 border-l-4 ${isTopic ? 'border-l-primary' : 'border-l-orange-400'} shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
              <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex-1 space-y-3">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input 
                        value={editValue.title} 
                        onChange={(e) => setEditValue({ ...editValue, title: e.target.value } as any)}
                        size={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duração (minutos)</Label>
                      <Input 
                        type="number"
                        value={editValue.duration_minutes} 
                        onChange={(e) => setEditValue({ ...editValue, duration_minutes: parseInt(e.target.value) || 0 } as any)}
                      />
                    </div>
                  </div>
                  {isTopic && (
                    <div className="space-y-1">
                      <Label className="text-xs">Apresentador</Label>
                      <Input 
                        value={(editValue as Topic).presenter_name || ''} 
                        onChange={(e) => setEditValue({ ...editValue, presenter_name: e.target.value } as any)}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Check className="w-4 h-4 mr-1" /> Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{item.itemType === 'topic' ? item.title : (item as any).title}</h3>
                        {!isTopic && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                            {item.type === 'almoço' ? <Utensils className="w-3 h-3 mr-1" /> : <Coffee className="w-3 h-3 mr-1" />}
                            {item.type}
                          </Badge>
                        )}
                      </div>
                      {isTopic && (item as Topic).description && (
                        <p className="text-sm text-slate-500 mt-1">{(item as Topic).description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        <Clock className="w-4 h-4" />
                        {item.duration_minutes} min
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item.id, item.itemType)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isTopic && (
                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Apresentador:</span>
                        {(item as Topic).presenter_name || 'Não definido'}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Participantes:</span>
                        <div className="flex flex-wrap gap-1">
                          {(item as Topic).participants?.map((p) => (
                            <Badge key={p.id} variant="outline" className="pr-1 gap-1 group/badge">
                              {p.participant_name}
                              <button 
                                onClick={() => onRemoveParticipant(p.id)}
                                className="hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                          <div className="flex items-center ml-1">
                            <Input 
                              placeholder="Add..." 
                              className="h-6 w-20 text-xs px-1 py-0 border-dashed"
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{meeting.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {format(new Date(meeting.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {format(new Date(meeting.date), "HH:mm")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mr-2">
              <Save className="w-3 h-3 animate-pulse" />
              Salvando...
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={() => handleAddItem('break')}>
            <Coffee className="w-4 h-4" />
            Adicionar Pausa
          </Button>
          <Button className="gap-2" onClick={() => handleAddItem('topic')}>
            <Plus className="w-4 h-4" />
            Adicionar Tópico
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-slate-200">
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
    </div>
  );
}
