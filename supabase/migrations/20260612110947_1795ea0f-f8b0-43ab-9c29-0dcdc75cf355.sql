
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'fan');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'declined');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CREATOR PROFILES ============
CREATE TABLE public.creator_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  long_bio TEXT,
  hero_image_url TEXT,
  niche_tags TEXT[] NOT NULL DEFAULT '{}',
  verified BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  total_sessions INT NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  starting_price_kes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.creator_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.creator_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO service_role;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active creators are public" ON public.creator_profiles FOR SELECT USING (active = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators manage own profile" ON public.creator_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Creators can create own profile" ON public.creator_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage creators" ON public.creator_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SESSION PACKAGES ============
CREATE TABLE public.session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price_kes INT NOT NULL CHECK (price_kes >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.session_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_packages TO authenticated;
GRANT ALL ON public.session_packages TO service_role;
ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active packages are public" ON public.session_packages FOR SELECT USING (active = true OR auth.uid() = creator_id);
CREATE POLICY "Creator manages own packages" ON public.session_packages FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.session_packages(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL,
  total_kes INT NOT NULL,
  platform_fee_kes INT NOT NULL,
  creator_payout_kes INT NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  mpesa_reference TEXT,
  meeting_room_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  fan_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Fans can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = fan_id);
CREATE POLICY "Parties can update bookings" ON public.bookings FOR UPDATE USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Fan writes review for own completed booking" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = fan_id AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.fan_id = auth.uid() AND b.status = 'completed'
  )
);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER creator_profiles_updated_at BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + fan role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'fan');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recompute creator rating after review
CREATE OR REPLACE FUNCTION public.update_creator_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.creator_profiles
  SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE creator_id = NEW.creator_id),
      total_sessions = (SELECT COUNT(*) FROM public.bookings WHERE creator_id = NEW.creator_id AND status = 'completed')
  WHERE user_id = NEW.creator_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER reviews_update_rating AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_creator_rating();

CREATE INDEX idx_bookings_fan ON public.bookings(fan_id);
CREATE INDEX idx_bookings_creator ON public.bookings(creator_id);
CREATE INDEX idx_packages_creator ON public.session_packages(creator_id);
CREATE INDEX idx_creators_active ON public.creator_profiles(active) WHERE active = true;
