-- 1. Tabel profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger untuk bind otomatis auth.users ke profiles (Google SSO)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Tabel daily_schedules
CREATE TABLE daily_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_name TEXT DEFAULT 'Ambil PIN SPMB',
  queue_date DATE NOT NULL UNIQUE,
  start_time TIME DEFAULT '07:00:00',
  end_time TIME DEFAULT '15:00:00',
  max_quota INT NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel tickets
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  schedule_id UUID REFERENCES daily_schedules(id) NOT NULL,
  queue_number INT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'completed', 'cancelled', 'no_show')),
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, schedule_id) -- 1 user hanya bisa 1 tiket per hari
);

-- 4. Tabel live_counters
CREATE TABLE live_counters (
  counter_no INT PRIMARY KEY,
  current_ticket_id UUID REFERENCES tickets(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSERTS DEFAULT LOKET
INSERT INTO live_counters (counter_no) VALUES (1), (2), (3), (4), (5);

-- 5. RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_counters ENABLE ROW LEVEL SECURITY;

-- Profiles: User bisa lihat dan update profilnya sendiri
CREATE POLICY "User can view own profile" ON profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "User can update own profile" ON profiles FOR UPDATE USING ( auth.uid() = id );

-- Schedules: Publik bisa baca
CREATE POLICY "Anyone can view daily schedules" ON daily_schedules FOR SELECT USING ( true );
-- Admin insert/update:
CREATE POLICY "Admin can full access schedules" ON daily_schedules FOR ALL USING ( 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
);

-- Tickets: User baca tiketnya sendiri
CREATE POLICY "User can view own tickets" ON tickets FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "Admin can full access tickets" ON tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
);

-- Counters: Publik bisa baca
CREATE POLICY "Anyone can view live counters" ON live_counters FOR SELECT USING ( true );
CREATE POLICY "Admin can update counters" ON live_counters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') 
);

-- 6. STORED PROCEDURE: take_ticket
CREATE OR REPLACE FUNCTION take_ticket(p_schedule_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_quota INT;
  v_current_count INT;
  v_next_number INT;
  v_ticket_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock row schedule untuk menghindari race condition
  SELECT max_quota INTO v_quota 
  FROM daily_schedules 
  WHERE id = p_schedule_id AND is_active = true 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or inactive';
  END IF;

  -- Cek apakah user sudah punya tiket di jadwal ini
  IF EXISTS (SELECT 1 FROM tickets WHERE user_id = v_user_id AND schedule_id = p_schedule_id) THEN
    RAISE EXCEPTION 'Anda sudah memiliki tiket antrean untuk tanggal ini.';
  END IF;

  -- Hitung tiket yg sudah keluar
  SELECT COUNT(*), COALESCE(MAX(queue_number), 0) INTO v_current_count, v_next_number
  FROM tickets 
  WHERE schedule_id = p_schedule_id;

  IF v_current_count >= v_quota THEN
    RAISE EXCEPTION 'Maaf, kuota antrean untuk hari ini sudah penuh.';
  END IF;

  -- Insert tiket baru
  v_next_number := v_next_number + 1;
  INSERT INTO tickets (user_id, schedule_id, queue_number, status)
  VALUES (v_user_id, p_schedule_id, v_next_number, 'waiting')
  RETURNING id INTO v_ticket_id;

  RETURN json_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'queue_number', v_next_number
  );
END;
$$;
