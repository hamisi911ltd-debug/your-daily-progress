
-- Add Zoom meeting columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT,
  ADD COLUMN IF NOT EXISTS zoom_meeting_password TEXT;

-- Add hybrid session support to packages
ALTER TABLE public.session_packages
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.session_packages
  ADD CONSTRAINT session_packages_session_type_check
    CHECK (session_type IN ('online', 'in-person', 'hybrid'));
