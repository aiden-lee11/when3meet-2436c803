-- Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  creator_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create availability table
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL CHECK (status IN ('unavailable', 'works', 'preferred')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, date, time)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- Public read access for events
CREATE POLICY "Events are publicly readable"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create events"
  ON public.events FOR INSERT
  WITH CHECK (true);

-- Public read/write for participants
CREATE POLICY "Participants are publicly readable"
  ON public.participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add participants"
  ON public.participants FOR INSERT
  WITH CHECK (true);

-- Public read/write for availability
CREATE POLICY "Availability is publicly readable"
  ON public.availability FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add availability"
  ON public.availability FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update availability"
  ON public.availability FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete availability"
  ON public.availability FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;