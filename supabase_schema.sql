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

-- RLS POLICIES

-- Meetings: User can only access their own meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own meetings" ON public.meetings
  FOR ALL USING (auth.uid() = user_id);

-- Topics: Accessible via meeting ownership
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage topics of their meetings" ON public.topics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE public.meetings.id = public.topics.meeting_id
      AND public.meetings.user_id = auth.uid()
    )
  );

-- Topic Participants: Accessible via topic ownership
ALTER TABLE public.topic_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage participants of their topics" ON public.topic_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.topics
      JOIN public.meetings ON public.meetings.id = public.topics.meeting_id
      WHERE public.topics.id = public.topic_participants.topic_id
      AND public.meetings.user_id = auth.uid()
    )
  );

-- Breaks: Accessible via meeting ownership
ALTER TABLE public.breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage breaks of their meetings" ON public.breaks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      WHERE public.meetings.id = public.breaks.meeting_id
      AND public.meetings.user_id = auth.uid()
    )
  );
