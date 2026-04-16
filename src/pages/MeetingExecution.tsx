import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Meeting, Topic, Break, AgendaItem, MeetingExecutionState, MeetingExecutionLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Maximize2, Minimize2, CheckCircle2, 
  AlertCircle, Clock, ArrowLeft,
  Volume2, VolumeX, User
} from 'lucide-react';
import { format, differenceInSeconds, addSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { handleNetworkError } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

export default function MeetingExecution() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alertPlayedRef = useRef<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      const [topicsRes, breaksRes] = await Promise.all([
        supabase.from('topics').select('*').eq('meeting_id', id).order('order_index'),
        supabase.from('breaks').select('*').eq('meeting_id', id).order('order_index')
      ]);

      const combinedItems: AgendaItem[] = [
        ...(topicsRes.data || []).map(t => ({ ...t, itemType: 'topic' as const })),
        ...(breaksRes.data || []).map(b => ({ ...b, itemType: 'break' as const }))
      ].sort((a, b) => a.order_index - b.order_index);

      setItems(combinedItems);
      
      // Initialize execution state if not present
      if (!meetingData.execution_state) {
        const initialState: MeetingExecutionState = {
          status: 'idle',
          current_item_id: combinedItems[0]?.id || null,
          current_item_type: combinedItems[0]?.itemType || null,
          start_time: null,
          paused_at: null,
          total_paused_ms: 0
        };
        await supabase.from('meetings').update({ execution_state: initialState }).eq('id', id);
        setMeeting({ ...meetingData, execution_state: initialState });
      }
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast.error(handleNetworkError(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateExecutionState = async (newState: Partial<MeetingExecutionState>) => {
    if (!meeting || !id) return;
    const updatedState = { ...meeting.execution_state, ...newState } as MeetingExecutionState;
    setMeeting({ ...meeting, execution_state: updatedState });
    await supabase.from('meetings').update({ execution_state: updatedState }).eq('id', id);
  };

  const startCurrentItem = async () => {
    if (!meeting?.execution_state?.current_item_id) return;
    
    const now = new Date().toISOString();
    await updateExecutionState({
      status: 'running',
      start_time: now,
      paused_at: null
    });

    // Log start
    const currentItem = items.find(i => i.id === meeting.execution_state?.current_item_id);
    if (currentItem) {
      await supabase.from('meeting_execution_logs').insert({
        meeting_id: id,
        topic_id: currentItem.itemType === 'topic' ? currentItem.id : null,
        break_id: currentItem.itemType === 'break' ? currentItem.id : null,
        item_type: currentItem.itemType,
        planned_duration: currentItem.duration_minutes,
        started_at: now
      });
    }
  };

  const pauseMeeting = async () => {
    await updateExecutionState({
      status: 'paused',
      paused_at: new Date().toISOString()
    });
  };

  const resumeMeeting = async () => {
    if (!meeting?.execution_state?.paused_at) return;
    
    const pausedAt = new Date(meeting.execution_state.paused_at);
    const now = new Date();
    const pausedMs = now.getTime() - pausedAt.getTime();
    
    await updateExecutionState({
      status: 'running',
      paused_at: null,
      total_paused_ms: (meeting.execution_state.total_paused_ms || 0) + pausedMs
    });
  };

  const nextItem = async () => {
    if (!meeting?.execution_state?.current_item_id) return;
    
    const currentIndex = items.findIndex(i => i.id === meeting.execution_state?.current_item_id);
    
    // Log end of current item
    const currentItem = items[currentIndex];
    const now = new Date().toISOString();
    if (currentItem && meeting.execution_state.start_time) {
      const actualDuration = Math.round(differenceInSeconds(new Date(now), new Date(meeting.execution_state.start_time)) / 60);
      await supabase.from('meeting_execution_logs')
        .update({ ended_at: now, actual_duration: actualDuration })
        .eq('meeting_id', id)
        .eq(currentItem.itemType === 'topic' ? 'topic_id' : 'break_id', currentItem.id)
        .is('ended_at', null);
    }

    if (currentIndex < items.length - 1) {
      const next = items[currentIndex + 1];
      await updateExecutionState({
        current_item_id: next.id,
        current_item_type: next.itemType,
        start_time: now,
        paused_at: null,
        total_paused_ms: 0
      });
      
      // Log start of next item
      await supabase.from('meeting_execution_logs').insert({
        meeting_id: id,
        topic_id: next.itemType === 'topic' ? next.id : null,
        break_id: next.itemType === 'break' ? next.id : null,
        item_type: next.itemType,
        planned_duration: next.duration_minutes,
        started_at: now
      });
      
      alertPlayedRef.current = {};
    } else {
      await updateExecutionState({ status: 'completed' });
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success('Reunião finalizada com sucesso!');
    }
  };

  const prevItem = async () => {
    if (!meeting?.execution_state?.current_item_id) return;
    const currentIndex = items.findIndex(i => i.id === meeting.execution_state?.current_item_id);
    if (currentIndex > 0) {
      const prev = items[currentIndex - 1];
      await updateExecutionState({
        current_item_id: prev.id,
        current_item_type: prev.itemType,
        start_time: new Date().toISOString(),
        paused_at: null,
        total_paused_ms: 0
      });
      alertPlayedRef.current = {};
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    if (meeting?.execution_state?.status === 'running' && meeting.execution_state.start_time) {
      const startTime = new Date(meeting.execution_state.start_time);
      const totalPaused = meeting.execution_state.total_paused_ms || 0;
      
      const updateTimer = () => {
        const now = new Date();
        const elapsed = differenceInSeconds(now, startTime) - Math.floor(totalPaused / 1000);
        setElapsedSeconds(elapsed);

        // Alerts
        const currentItem = items.find(i => i.id === meeting.execution_state?.current_item_id);
        if (currentItem) {
          const totalSeconds = currentItem.duration_minutes * 60;
          const remaining = totalSeconds - elapsed;

          if (remaining <= 120 && remaining > 119 && !alertPlayedRef.current['2min']) {
            toast.warning('Faltam 2 minutos para o fim do tópico!', { duration: 5000 });
            if (soundEnabled) playAlertSound();
            alertPlayedRef.current['2min'] = true;
          }

          if (remaining <= 0 && !alertPlayedRef.current['ended']) {
            toast.error('Tempo esgotado para este tópico!', { duration: 5000 });
            if (soundEnabled) playAlertSound();
            alertPlayedRef.current['ended'] = true;
          }
        }
      };

      timerRef.current = setInterval(updateTimer, 1000);
      updateTimer();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [meeting?.execution_state, items, soundEnabled]);

  const playAlertSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  if (!meeting) return <div className="flex items-center justify-center min-h-screen">Reunião não encontrada</div>;

  const currentItem = items.find(i => i.id === meeting.execution_state?.current_item_id);
  const currentIndex = items.findIndex(i => i.id === meeting.execution_state?.current_item_id);
  const totalDuration = items.reduce((acc, item) => acc + item.duration_minutes, 0);
  
  const remainingSeconds = currentItem ? (currentItem.duration_minutes * 60) - elapsedSeconds : 0;
  const isOvertime = remainingSeconds < 0;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isFullscreen ? 'bg-slate-900 text-white p-8' : 'bg-background p-6'}`}>
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!isFullscreen && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/meeting/${id}`)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className={`text-xl font-bold ${isFullscreen ? 'text-white' : 'text-foreground'}`}>
                {meeting.title}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(currentTime, "HH:mm:ss")}
                </div>
                {isOvertime && (
                  <Badge variant="destructive" className="h-5 text-[10px] animate-pulse">
                    EM ATRASO
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Main Execution Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* Current Item Focus */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {currentItem ? (
                <motion.div
                  key={currentItem.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="flex-1"
                >
                  <Card className={`h-full border-none shadow-xl overflow-hidden flex flex-col ${isFullscreen ? 'bg-slate-800/50 border border-slate-700' : 'bg-white'}`}>
                    <div className={`h-1.5 w-full ${currentItem.itemType === 'topic' ? 'bg-primary' : 'bg-amber-500'}`} />
                    <CardContent className="p-10 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-8">
                        <Badge variant={currentItem.itemType === 'topic' ? 'default' : 'secondary'} className="px-3 h-6 text-[11px] font-bold uppercase tracking-wider">
                          {currentItem.itemType === 'topic' ? 'Tópico Atual' : 'Pausa Atual'}
                        </Badge>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duração Planejada</p>
                          <p className={`text-xl font-bold ${isFullscreen ? 'text-white' : 'text-foreground'}`}>{currentItem.duration_minutes} min</p>
                        </div>
                      </div>

                      <h2 className={`text-4xl md:text-5xl font-bold mb-4 tracking-tight ${isFullscreen ? 'text-white' : 'text-foreground'}`}>{currentItem.title}</h2>
                      <p className={`text-lg mb-8 flex-1 leading-relaxed ${isFullscreen ? 'text-slate-300' : 'text-muted-foreground'}`}>
                        {currentItem.description || 'Sem descrição adicional para este tópico.'}
                      </p>

                      {currentItem.itemType === 'topic' && (currentItem as Topic).presenter_name && (
                        <div className={`flex items-center gap-3 p-4 rounded-xl mb-8 ${isFullscreen ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsável</p>
                            <p className={`text-base font-bold ${isFullscreen ? 'text-white' : 'text-foreground'}`}>{(currentItem as Topic).presenter_name}</p>
                          </div>
                        </div>
                      )}

                      {/* Timer Display */}
                      <div className={`mt-auto pt-10 border-t ${isFullscreen ? 'border-slate-700' : 'border-slate-100'}`}>
                        <div className="flex flex-col items-center">
                          <div className={`text-9xl font-mono font-black tracking-tighter tabular-nums ${isOvertime ? 'text-rose-500' : isFullscreen ? 'text-white' : 'text-foreground'}`}>
                            {isOvertime && '-'}
                            {Math.floor(Math.abs(remainingSeconds) / 60).toString().padStart(2, '0')}:
                            {(Math.abs(remainingSeconds) % 60).toString().padStart(2, '0')}
                          </div>
                          <p className={`text-sm font-bold tracking-[0.2em] mt-4 ${isOvertime ? 'text-rose-500 animate-pulse' : 'text-muted-foreground'}`}>
                            {isOvertime ? 'TEMPO EXCEDIDO' : 'TEMPO RESTANTE'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className={`flex-1 flex flex-col items-center justify-center text-center p-12 rounded-3xl border-2 border-dashed ${isFullscreen ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-border'}`}>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className={`text-3xl font-bold mb-2 ${isFullscreen ? 'text-white' : 'text-foreground'}`}>Reunião Concluída!</h2>
                  <p className="text-muted-foreground text-lg mb-8">Todos os tópicos foram discutidos com sucesso.</p>
                  <Button size="lg" onClick={() => navigate(`/meeting/${id}`)} className="shadow-lg">
                    Voltar para Detalhes
                  </Button>
                </div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className={`flex items-center justify-center gap-4 p-5 rounded-2xl shadow-xl border ${isFullscreen ? 'bg-slate-800 border-slate-700' : 'bg-white border-border'}`}>
              <Button variant="outline" size="lg" className="h-12 w-12 p-0" onClick={prevItem} disabled={currentIndex <= 0}>
                <SkipBack className="w-5 h-5" />
              </Button>
              
              {meeting.execution_state?.status === 'idle' ? (
                <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl shadow-primary/20 shadow-lg" onClick={startCurrentItem}>
                  <Play className="w-5 h-5 mr-2 fill-current" /> Iniciar Reunião
                </Button>
              ) : meeting.execution_state?.status === 'paused' ? (
                <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl shadow-primary/20 shadow-lg" onClick={resumeMeeting}>
                  <Play className="w-5 h-5 mr-2 fill-current" /> Retomar
                </Button>
              ) : (
                <Button size="lg" variant="secondary" className="h-14 px-10 text-base font-bold rounded-xl" onClick={pauseMeeting}>
                  <Pause className="w-5 h-5 mr-2 fill-current" /> Pausar
                </Button>
              )}

              <Button variant="outline" size="lg" className="h-12 w-12 p-0" onClick={nextItem} disabled={currentIndex >= items.length - 1 && meeting.execution_state?.status === 'completed'}>
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Sidebar - Agenda Progress */}
          <div className="flex flex-col gap-6">
            <Card className={`flex-1 overflow-hidden flex flex-col border-none shadow-lg ${isFullscreen ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-border'}`}>
              <CardHeader className={`p-5 border-b ${isFullscreen ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-border'}`}>
                <CardTitle className={`text-sm font-bold uppercase tracking-wider ${isFullscreen ? 'text-slate-300' : 'text-muted-foreground'}`}>Próximos Itens</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                <div className="divide-y divide-slate-100/10">
                  {items.map((item, index) => {
                    const isCurrent = item.id === meeting.execution_state?.current_item_id;
                    const isPast = index < currentIndex;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 transition-colors ${isCurrent ? (isFullscreen ? 'bg-primary/20 border-l-4 border-primary' : 'bg-primary/5 border-l-4 border-primary') : isPast ? 'opacity-40' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className={`font-bold text-sm ${isCurrent ? (isFullscreen ? 'text-white' : 'text-primary') : (isFullscreen ? 'text-slate-300' : 'text-foreground')}`}>
                              {item.title}
                            </h4>
                            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">{item.duration_minutes} min</p>
                          </div>
                          {isPast && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {isCurrent && <div className="w-2 h-2 bg-primary rounded-full animate-ping" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-white border-none shadow-lg shadow-primary/20">
              <CardContent className="p-6">
                <h4 className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-widest mb-4">Progresso da Reunião</h4>
                <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${((currentIndex + (meeting.execution_state?.status === 'completed' ? 1 : 0)) / items.length) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>{currentIndex + (meeting.execution_state?.status === 'completed' ? 1 : 0)} de {items.length} itens</span>
                  <span>{Math.round(((currentIndex + (meeting.execution_state?.status === 'completed' ? 1 : 0)) / items.length) * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
