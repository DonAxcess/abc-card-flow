
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table (basic: name, email, phone)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Business cards table
CREATE TYPE public.card_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TABLE public.business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_category TEXT NOT NULL DEFAULT 'General',
  description TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_website TEXT DEFAULT '',
  location TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  card_image_url TEXT DEFAULT '',
  status card_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  auto_approve_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved cards" ON public.business_cards FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own cards" ON public.business_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.business_cards FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cards" ON public.business_cards FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_business_cards_updated_at BEFORE UPDATE ON public.business_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Slots table (A1-K2 = 22 slots)
CREATE TABLE public.slots (
  id TEXT PRIMARY KEY, -- e.g. 'A1', 'A2', 'B1' etc
  label TEXT NOT NULL,
  row_letter CHAR(1) NOT NULL,
  col_number INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Admins can manage slots" ON public.slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed the 22 slots
INSERT INTO public.slots (id, label, row_letter, col_number) VALUES
  ('A1','A1','A',1),('A2','A2','A',2),
  ('B1','B1','B',1),('B2','B2','B',2),
  ('C1','C1','C',1),('C2','C2','C',2),
  ('D1','D1','D',1),('D2','D2','D',2),
  ('E1','E1','E',1),('E2','E2','E',2),
  ('F1','F1','F',1),('F2','F2','F',2),
  ('G1','G1','G',1),('G2','G2','G',2),
  ('H1','H1','H',1),('H2','H2','H',2),
  ('I1','I1','I',1),('I2','I2','I',2),
  ('J1','J1','J',1),('J2','J2','J',2),
  ('K1','K1','K',1),('K2','K2','K',2);

-- Slot assignments (which card is in which slot, with rotation queue)
CREATE TABLE public.slot_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id TEXT NOT NULL REFERENCES public.slots(id),
  card_id UUID NOT NULL REFERENCES public.business_cards(id) ON DELETE CASCADE,
  position_in_queue INT NOT NULL DEFAULT 0,
  rotation_start TIMESTAMPTZ,
  rotation_end TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view assignments" ON public.slot_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can manage assignments" ON public.slot_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own assignments" ON public.slot_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.business_cards bc WHERE bc.id = card_id AND bc.user_id = auth.uid())
);
CREATE TRIGGER update_slot_assignments_updated_at BEFORE UPDATE ON public.slot_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments table (M-Pesa mock for now)
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.business_cards(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  phone_number TEXT NOT NULL,
  mpesa_receipt TEXT,
  mpesa_checkout_request_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-approval function (approve cards after 24 hours if not rejected)
CREATE OR REPLACE FUNCTION public.auto_approve_pending_cards()
RETURNS void AS $$
BEGIN
  UPDATE public.business_cards
  SET status = 'approved', approved_at = now()
  WHERE status = 'pending' AND auto_approve_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Storage bucket for card images
INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', true);
CREATE POLICY "Anyone can view card images" ON storage.objects FOR SELECT USING (bucket_id = 'card-images');
CREATE POLICY "Authenticated users can upload card images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'card-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own card images" ON storage.objects FOR UPDATE USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own card images" ON storage.objects FOR DELETE USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
