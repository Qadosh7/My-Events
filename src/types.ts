export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface Topic {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  order_index: number;
  presenter_name: string | null;
  created_at: string;
  participants?: TopicParticipant[];
}

export interface TopicParticipant {
  id: string;
  topic_id: string;
  participant_name: string;
}

export interface Break {
  id: string;
  meeting_id: string;
  type: string;
  duration_minutes: number;
  order_index: number;
  title?: string; // Added for frontend display
}

export type AgendaItem = (Topic & { itemType: 'topic' }) | (Break & { itemType: 'break' });
