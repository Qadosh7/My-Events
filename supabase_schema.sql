-- Create users table (handled by Supabase Auth, but we can have a public profile)
-- CREATE TABLE public.profiles (
--   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
--   email TEXT UNIQUE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
-- );

-- Meetings table
CREATE TABLE public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Topics table
CREATE TABLE public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 0 NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  presenter_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Topic participants table
CREATE TABLE public.topic_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL
);

-- Breaks table
CREATE TABLE public.breaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'pausa' NOT NULL, -- e.g., "pausa", "almoço"
  duration_minutes INTEGER DEFAULT 0 NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL
);

-- NEW TABLES FOR SAAS EVOLUTION

-- Shared Meetings table
CREATE TABLE public.shared_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_email TEXT NOT NULL,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(meeting_id, shared_with_email)
);

-- Meeting Execution Logs
CREATE TABLE public.meeting_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID, -- Can be null for breaks
  break_id UUID,
  item_type TEXT CHECK (item_type IN ('topic', 'break')) NOT NULL,
  planned_duration INTEGER NOT NULL,
  actual_duration INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add execution state to meetings
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS execution_state JSONB DEFAULT NULL;
-- execution_state structure: { status: 'idle' | 'running' | 'paused' | 'completed', current_item_id: string, current_item_type: 'topic' | 'break', start_time: string, paused_at: string, total_paused_ms: number }

-- RLS POLICIES UPDATES

-- Meetings: Owner has full access, shared users have access based on permission
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own meetings" ON public.meetings;

CREATE POLICY "Owners have full access to meetings" ON public.meetings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Shared users can view meetings" ON public.meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE public.shared_meetings.meeting_id = public.meetings.id
      AND public.shared_meetings.shared_with_email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Shared users with edit permission can update meetings" ON public.meetings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shared_meetings
      WHERE public.shared_meetings.meeting_id = public.meetings.id
      AND public.shared_meetings.shared_with_email = auth.jwt()->>'email'
      AND public.shared_meetings.permission = 'edit'
    )
  );

-- Shared Meetings: Owner can manage, shared users can view
ALTER TABLE public.shared_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage shared meetings" ON public.shared_meetings
  FOR ALL USING (auth.uid() = owner_user_id);
CREATE POLICY "Shared users can view their shares" ON public.shared_meetings
  FOR SELECT USING (shared_with_email = auth.jwt()->>'email');

-- Topics, Breaks, Participants: Inherit from meeting access
-- We need to update existing policies to include shared access

DROP POLICY IF EXISTS "Users can manage topics of their meetings" ON public.topics;
CREATE POLICY "Access topics via meeting ownership or share" ON public.topics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE public.meetings.id = public.topics.meeting_id
      AND (
        public.meetings.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.shared_meetings
          WHERE public.shared_meetings.meeting_id = public.meetings.id
          AND public.shared_meetings.shared_with_email = auth.jwt()->>'email'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage breaks of their meetings" ON public.breaks;
CREATE POLICY "Access breaks via meeting ownership or share" ON public.breaks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE public.meetings.id = public.breaks.meeting_id
      AND (
        public.meetings.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.shared_meetings
          WHERE public.shared_meetings.meeting_id = public.meetings.id
          AND public.shared_meetings.shared_with_email = auth.jwt()->>'email'
        )
      )
    )
  );

-- Execution Logs
ALTER TABLE public.meeting_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage logs via meeting access" ON public.meeting_execution_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE public.meetings.id = public.meeting_execution_logs.meeting_id
      AND (
        public.meetings.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.shared_meetings
          WHERE public.shared_meetings.meeting_id = public.meetings.id
          AND public.shared_meetings.shared_with_email = auth.jwt()->>'email'
        )
      )
    )
  );

-- SAAS MONETIZATION TABLES

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled')) NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_user_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);

-- Trigger to create free subscription on user creation
-- Note: This requires the auth.users table to exist and triggers to be enabled
-- CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.subscriptions (user_id, plan, status)
--   VALUES (new.id, 'free', 'active');
--   RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- CREATE TRIGGER on_auth_user_created_subscription
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();
