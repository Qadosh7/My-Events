export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  created_at: string;
  execution_state?: MeetingExecutionState | null;
}

export interface MeetingExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed';
  current_item_id: string | null;
  current_item_type: 'topic' | 'break' | null;
  start_time: string | null;
  paused_at: string | null;
  total_paused_ms: number;
}

export interface MeetingExecutionLog {
  id: string;
  meeting_id: string;
  topic_id: string | null;
  break_id: string | null;
  item_type: 'topic' | 'break';
  planned_duration: number;
  actual_duration: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface SharedMeeting {
  id: string;
  meeting_id: string;
  owner_user_id: string;
  shared_with_email: string;
  permission: 'view' | 'edit';
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

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: 'active' | 'canceled';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  invited_user_email: string;
  status: 'pending' | 'accepted';
  created_at: string;
}
