-- Additive: Non-Process freeform Activity Type (CNF Details creatable dropdown).
ALTER TABLE public.support_activities
  ADD COLUMN IF NOT EXISTS activity_type text;

COMMENT ON COLUMN public.support_activities.activity_type IS
  'Freeform Non-Process activity type; reusable_options category activity_type.';
