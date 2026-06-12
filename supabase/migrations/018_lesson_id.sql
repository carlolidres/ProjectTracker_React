ALTER TABLE public.lessons_learned
  ADD COLUMN IF NOT EXISTS lesson_id text;

CREATE INDEX IF NOT EXISTS lessons_learned_lesson_id_idx ON public.lessons_learned (lesson_id);
